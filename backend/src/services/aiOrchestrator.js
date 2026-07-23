/**
 * ============================================================
 * AI ORCHESTRATOR — PaySphereX Intelligence Layer
 * ============================================================
 * Core service responsible for:
 *  1. RAG — fetching only relevant DB data per query
 *  2. Context structuring — minimal, typed JSON context
 *  3. Prompt engineering — role-grounded, task-specific prompts
 *  4. LLM invocation — Anthropic Claude API
 *  5. Response post-processing — structured, validated output
 *  6. In-memory caching — TTL-based, keyed by context hash
 *  7. Fallback handling — graceful degradation if AI fails
 * ============================================================
 */

const Anthropic = require("@anthropic-ai/sdk");
const { query }  = require("../db/pool");
const logger     = require("../utils/logger");
const crypto     = require("crypto");

// ── Client ────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── In-memory cache (production: replace with Redis) ──────
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);
}
function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  cache.set(key, { data, ts: Date.now() });
  // Evict oldest entries if cache grows too large
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// ── System prompt (grounded HR analytics role) ────────────
const SYSTEM_PROMPT = `You are PaySphereX AI — a Senior HR Analytics Intelligence Engine embedded in an enterprise workforce management platform.

Your role: Analyze workforce data, identify risks, explain root causes, and recommend precise, actionable interventions.

Core principles:
- NEVER give generic advice ("improve communication", "work on culture"). Every recommendation must be tied to specific data.
- ALWAYS cite the metric that drives your conclusion (e.g., "sick leave at 8 days vs 3-day average indicates...")
- Be concise — executives read your output. No filler sentences.
- Quantify risk levels: use percentages, thresholds, and comparisons.
- Separate observations (what the data shows) from recommendations (what HR should do).

Output format: Always return a valid JSON object with this structure:
{
  "summary": "1-2 sentence executive summary",
  "risk_level": "Critical|High|Medium|Low",
  "risk_score": 0-100,
  "observations": [
    { "signal": "metric name", "value": "measured value", "benchmark": "expected value", "interpretation": "what this means" }
  ],
  "root_causes": ["specific cause 1", "specific cause 2"],
  "recommendations": [
    { "action": "specific action", "priority": "Immediate|Short-term|Long-term", "owner": "HR|Manager|Finance" }
  ],
  "confidence": "High|Medium|Low",
  "data_coverage": "description of what data was analyzed"
}`;

// ── RAG: fetch only relevant data per intent ──────────────

/**
 * Fetch department-scoped context for attrition/risk analysis
 */
async function fetchDepartmentContext(department, year = new Date().getFullYear()) {
  const deptFilter = department && department !== "all" ? `AND d.name ILIKE $1` : "";
  const params     = department && department !== "all" ? [`%${department}%`] : [];

  // Employee risk signals
  const empQuery = `
    SELECT
      e.id, e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS full_name,
      e.job_title, d.name AS department,
      DATE_PART('year', AGE(e.date_joined)) AS years_of_service,

      -- Sick leave in current year
      COALESCE(SUM(CASE WHEN lt.code = 'SL' AND lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) AS sick_leave_days,

      -- Total absences
      COALESCE((
        SELECT COUNT(*) FROM attendance a
        WHERE a.employee_id = e.id AND a.status = 'absent'
        AND EXTRACT(YEAR FROM a.date) = ${ params.length + 1 }
      ), 0) AS absent_days,

      -- Overtime
      COALESCE((
        SELECT SUM(overtime_hours) FROM attendance a
        WHERE a.employee_id = e.id
        AND EXTRACT(YEAR FROM a.date) = ${ params.length + 1 }
      ), 0) AS total_overtime,

      -- Average work hours
      COALESCE((
        SELECT AVG(work_hours) FROM attendance a
        WHERE a.employee_id = e.id AND a.status = 'present'
        AND EXTRACT(YEAR FROM a.date) = ${ params.length + 1 }
      ), 0) AS avg_work_hours,

      -- Latest salary
      ss.base_salary,
      ss.base_salary + ss.hra + ss.transport_allowance + ss.medical_allowance + ss.special_allowance AS gross_salary

    FROM employees e
    JOIN departments d ON e.department_id = d.id
    LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND EXTRACT(YEAR FROM lr.start_date) = ${ params.length + 1 }
    LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
    LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.is_current = TRUE
    WHERE e.is_active = TRUE ${deptFilter}
    GROUP BY e.id, e.employee_code, e.first_name, e.last_name,
             e.job_title, d.name, e.date_joined, ss.base_salary,
             ss.hra, ss.transport_allowance, ss.medical_allowance, ss.special_allowance
    ORDER BY sick_leave_days DESC, absent_days DESC
    LIMIT 15
  `;

  const finalParams = department && department !== "all" ? [`%${department}%`, year] : [year];
  const empResult   = await query(empQuery, finalParams);
  const employees   = empResult.rows;

  if (employees.length === 0) return null;

  // Compute burnout scores inline
  const enriched = employees.map(emp => {
    const overtime  = parseFloat(emp.total_overtime || 0);
    const sick      = parseFloat(emp.sick_leave_days || 0);
    const absent    = parseFloat(emp.absent_days || 0);
    const hours     = parseFloat(emp.avg_work_hours || 8);
    const burnoutScore = Math.min(100, Math.round(
      Math.min(40, overtime * 0.8) +
      Math.min(25, sick * 3.5) +
      Math.min(20, absent * 2.5) +
      (hours > 10 ? Math.min(15, (hours - 8) * 3) : 0)
    ));
    // Attrition probability (simplified logistic-style heuristic)
    const attritionProb = Math.min(1, (
      (sick / 12) * 0.30 +
      (absent / 22) * 0.25 +
      (overtime / 80) * 0.20 +
      (Math.max(0, 10 - parseFloat(emp.years_of_service || 0)) / 10) * 0.25
    ));
    const riskLevel = attritionProb >= 0.6 ? "High" : attritionProb >= 0.3 ? "Medium" : "Low";
    return { ...emp, burnoutScore, attritionProb: parseFloat(attritionProb.toFixed(3)), riskLevel };
  });

  // Aggregate department summary
  const avgAttrition = enriched.reduce((s, e) => s + e.attritionProb, 0) / enriched.length;
  const avgBurnout   = enriched.reduce((s, e) => s + e.burnoutScore, 0) / enriched.length;
  const avgSickDays  = enriched.reduce((s, e) => s + parseFloat(e.sick_leave_days), 0) / enriched.length;
  const avgOvertime  = enriched.reduce((s, e) => s + parseFloat(e.total_overtime), 0) / enriched.length;
  const highRiskCount = enriched.filter(e => e.riskLevel === "High").length;

  return {
    department:   department || "All Departments",
    headcount:    enriched.length,
    summary: {
      avg_attrition_probability: parseFloat(avgAttrition.toFixed(3)),
      avg_burnout_score:         Math.round(avgBurnout),
      avg_sick_leave_days:       parseFloat(avgSickDays.toFixed(1)),
      avg_overtime_hours:        parseFloat(avgOvertime.toFixed(1)),
      high_risk_count:           highRiskCount,
      high_risk_percentage:      parseFloat(((highRiskCount / enriched.length) * 100).toFixed(1)),
    },
    benchmarks: {
      healthy_sick_leave_days:  3,
      healthy_burnout_score:    25,
      healthy_attrition_prob:   0.20,
      standard_work_hours_day:  9,
    },
    top_risks: enriched
      .filter(e => e.riskLevel !== "Low")
      .sort((a, b) => b.attritionProb - a.attritionProb)
      .slice(0, 5)
      .map(e => ({
        name:             e.full_name,
        code:             e.employee_code,
        job_title:        e.job_title,
        risk_level:       e.riskLevel,
        attrition_prob:   `${(e.attritionProb * 100).toFixed(0)}%`,
        burnout_score:    e.burnoutScore,
        sick_leave_days:  e.sick_leave_days,
        overtime_hours:   parseFloat(e.total_overtime).toFixed(1),
      })),
    all_employees: enriched.map(e => ({
      name:           e.full_name,
      risk_level:     e.riskLevel,
      attrition_prob: `${(e.attritionProb * 100).toFixed(0)}%`,
      burnout_score:  e.burnoutScore,
    })),
  };
}

/**
 * Fetch single-employee context for deep insight
 */
async function fetchEmployeeContext(employeeId) {
  const year = new Date().getFullYear();

  const [empResult, leaveResult, attResult, payResult] = await Promise.all([
    // Core employee profile + salary
    query(`
      SELECT
        e.id, e.employee_code,
        CONCAT(e.first_name, ' ', e.last_name) AS full_name,
        e.job_title, e.employment_type,
        DATE_PART('year', AGE(e.date_joined)) AS years_of_service,
        d.name AS department,
        ss.base_salary, ss.income_tax_tds,
        ss.base_salary + ss.hra + ss.transport_allowance + ss.medical_allowance + ss.special_allowance AS gross_salary
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.is_current = TRUE
      WHERE e.id = $1 AND e.is_active = TRUE
    `, [employeeId]),

    // Leave breakdown by type
    query(`
      SELECT lt.name, lt.code,
        COUNT(*) AS requests,
        SUM(lr.total_days) AS total_days,
        SUM(CASE WHEN lr.status='approved' THEN lr.total_days ELSE 0 END) AS approved_days
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE lr.employee_id = $1 AND EXTRACT(YEAR FROM lr.start_date) = $2
      GROUP BY lt.name, lt.code
      ORDER BY total_days DESC
    `, [employeeId, year]),

    // Attendance summary
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status='present') AS present_days,
        COUNT(*) FILTER (WHERE status='absent')  AS absent_days,
        ROUND(AVG(work_hours)::numeric, 2)        AS avg_work_hours,
        ROUND(SUM(overtime_hours)::numeric, 2)    AS total_overtime,
        COUNT(*) FILTER (WHERE check_in IS NOT NULL AND check_in::time > '09:30') AS late_arrivals
      FROM attendance
      WHERE employee_id = $1 AND EXTRACT(YEAR FROM date) = $2
    `, [employeeId, year]),

    // Last 3 months payslips
    query(`
      SELECT pay_period, gross_salary, net_salary, total_deductions, performance_bonus
      FROM payslips
      WHERE employee_id = $1
      ORDER BY pay_period DESC LIMIT 3
    `, [employeeId]),
  ]);

  if (!empResult.rows[0]) return null;

  const emp  = empResult.rows[0];
  const att  = attResult.rows[0] || {};
  const sick = leaveResult.rows.find(l => l.code === "SL");

  // Compute risk signals
  const burnoutScore = Math.min(100, Math.round(
    Math.min(40, parseFloat(att.total_overtime || 0) * 0.8) +
    Math.min(25, parseFloat(sick?.total_days || 0) * 3.5) +
    Math.min(20, parseFloat(att.absent_days || 0) * 2.5) +
    (parseFloat(att.avg_work_hours || 8) > 10
      ? Math.min(15, (parseFloat(att.avg_work_hours) - 8) * 3) : 0)
  ));

  return {
    employee: {
      code:            emp.employee_code,
      name:            emp.full_name,
      job_title:       emp.job_title,
      department:      emp.department,
      tenure_years:    parseFloat(emp.years_of_service || 0).toFixed(1),
      employment_type: emp.employment_type,
      base_salary:     emp.base_salary,
      gross_salary:    emp.gross_salary,
    },
    attendance: {
      present_days:   parseInt(att.present_days || 0),
      absent_days:    parseInt(att.absent_days  || 0),
      late_arrivals:  parseInt(att.late_arrivals || 0),
      avg_work_hours: parseFloat(att.avg_work_hours || 0).toFixed(2),
      total_overtime: parseFloat(att.total_overtime || 0).toFixed(1),
    },
    leave: leaveResult.rows.map(l => ({
      type:          l.name,
      code:          l.code,
      requests:      parseInt(l.requests),
      total_days:    parseFloat(l.total_days),
      approved_days: parseFloat(l.approved_days || 0),
    })),
    payroll: payResult.rows.map(p => ({
      period:      p.pay_period,
      gross:       parseFloat(p.gross_salary),
      net:         parseFloat(p.net_salary),
      deductions:  parseFloat(p.total_deductions),
      bonus:       parseFloat(p.performance_bonus || 0),
    })),
    risk_signals: {
      burnout_score:  burnoutScore,
      total_sick_days: parseFloat(sick?.total_days || 0),
      total_overtime:  parseFloat(att.total_overtime || 0).toFixed(1),
      absence_rate:    parseFloat(att.absent_days || 0) > 0
        ? `${((parseFloat(att.absent_days) / (parseInt(att.present_days || 1) + parseInt(att.absent_days || 0))) * 100).toFixed(1)}%`
        : "0%",
    },
    benchmarks: {
      healthy_sick_days: 3,
      healthy_burnout:   25,
      max_overtime_month: 20,
    },
  };
}

/**
 * Fetch org-wide summary for high-level queries
 */
async function fetchOrganizationContext() {
  const year  = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const [deptResult, payrollResult, leaveResult, attResult] = await Promise.all([
    // Department-level risk aggregation
    query(`
      SELECT d.name AS department, COUNT(e.id) AS headcount,
        COALESCE(SUM(CASE WHEN lt.code='SL' AND lr.status='approved' THEN lr.total_days ELSE 0 END), 0) AS total_sick_days,
        COALESCE(SUM(a.overtime_hours), 0) AS total_overtime,
        COALESCE(AVG(ss.base_salary), 0) AS avg_salary
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND EXTRACT(YEAR FROM lr.start_date) = $1
      LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
      LEFT JOIN attendance a ON a.employee_id = e.id AND EXTRACT(YEAR FROM a.date) = $1
      LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.is_current = TRUE
      WHERE e.is_active = TRUE
      GROUP BY d.name ORDER BY total_sick_days DESC
    `, [year]),

    // Latest payroll run
    query(`
      SELECT SUM(net_salary) AS total_net, SUM(gross_salary) AS total_gross,
             COUNT(*) AS employee_count, pay_period
      FROM payslips
      WHERE pay_period = $1
      GROUP BY pay_period
    `, [`${year}-${String(month).padStart(2, "0")}`]),

    // Leave volume by type
    query(`
      SELECT lt.name, lt.code, COUNT(*) AS requests,
             SUM(lr.total_days) AS total_days
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
      GROUP BY lt.name, lt.code ORDER BY total_days DESC
    `, [year]),

    // Attendance this month
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status='present') AS present,
        COUNT(*) FILTER (WHERE status='absent')  AS absent,
        ROUND(AVG(work_hours)::numeric, 2)        AS avg_hours
      FROM attendance
      WHERE EXTRACT(YEAR FROM date)=$1 AND EXTRACT(MONTH FROM date)=$2
    `, [year, month]),
  ]);

  const att = attResult.rows[0] || {};
  const pay = payrollResult.rows[0] || {};

  return {
    organization: "PaySphereX",
    period: { year, month },
    workforce: {
      total_employees:    deptResult.rows.reduce((s, d) => s + parseInt(d.headcount), 0),
      departments:        deptResult.rows.length,
      avg_attendance_rate: att.present && att.absent
        ? `${((parseInt(att.present) / (parseInt(att.present) + parseInt(att.absent))) * 100).toFixed(1)}%`
        : "N/A",
    },
    payroll_summary: {
      total_net:   parseFloat(pay.total_net  || 0),
      total_gross: parseFloat(pay.total_gross || 0),
      period:      pay.pay_period || "N/A",
    },
    leave_breakdown: leaveResult.rows.map(l => ({
      type:        l.name,
      code:        l.code,
      requests:    parseInt(l.requests),
      total_days:  parseFloat(l.total_days),
    })),
    department_risk: deptResult.rows.map(d => ({
      name:             d.department,
      headcount:        parseInt(d.headcount),
      sick_days_total:  parseFloat(d.total_sick_days),
      sick_days_per_emp: parseFloat(d.headcount) > 0
        ? parseFloat((parseFloat(d.total_sick_days) / parseFloat(d.headcount)).toFixed(1)) : 0,
      overtime_total:   parseFloat(d.total_overtime).toFixed(1),
      avg_salary:       Math.round(parseFloat(d.avg_salary)),
    })),
  };
}

// ── Prompt builder ────────────────────────────────────────

function buildUserPrompt(intent, context, userQuestion) {
  const contextJson = JSON.stringify(context, null, 2);

  const intentInstructions = {
    department_risk: `
Analyze the department-level workforce risk data. Focus on:
1. Which signals are above benchmark thresholds (sick leave >3 days, burnout >25, attrition >20%)
2. Root causes driving those deviations
3. Which specific employees need immediate attention
4. Prioritized HR actions for this department`,

    employee_insight: `
Perform a deep analysis of this individual employee's risk profile. Focus on:
1. What the attendance, leave, and payroll data reveals about their engagement/wellbeing
2. Whether burnout or attrition risk is developing and why
3. Specific signals (e.g., spike in sick leave, late arrivals, declining work hours)
4. Recommended HR actions tailored to this employee's situation`,

    general_query: `
Answer the user's question using the organizational data provided. Focus on:
1. Direct, data-backed answer to the question
2. Supporting metrics from the context
3. Actionable next steps for HR or management`,
  };

  return `
WORKFORCE DATA CONTEXT:
${contextJson}

TASK: ${intentInstructions[intent] || intentInstructions.general_query}

${userQuestion ? `USER QUESTION: "${userQuestion}"` : ""}

Respond ONLY with the JSON structure defined in your system prompt. No markdown, no explanation outside JSON.`;
}

// ── LLM call with timeout + retry ────────────────────────

async function callLLM(systemPrompt, userPrompt, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userPrompt }],
    });

    clearTimeout(timer);

    const raw  = response.content[0]?.text || "";
    // Strip any accidental markdown fences
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(clean);

  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("AI_TIMEOUT");
    if (err instanceof SyntaxError) throw new Error("AI_PARSE_ERROR");
    throw err;
  }
}

// ── Fallback response ─────────────────────────────────────

function buildFallback(intent, context) {
  return {
    summary:        "AI analysis temporarily unavailable. Showing computed metrics.",
    risk_level:     "Unknown",
    risk_score:     null,
    observations:   [],
    root_causes:    ["AI service unavailable — review metrics manually"],
    recommendations: [
      { action: "Review employee data in the Analytics dashboard", priority: "Short-term", owner: "HR" },
      { action: "Re-run AI analysis after service restoration",    priority: "Short-term", owner: "HR" },
    ],
    confidence:     "Low",
    data_coverage:  "Raw metrics available — AI narrative generation failed",
    fallback:       true,
  };
}

// ── Main orchestrator entry points ────────────────────────

/**
 * Orchestrate a department-level risk analysis
 */
async function analyzeDepartment(department, userQuestion = null) {
  const key = cacheKey({ type: "dept", department, q: userQuestion });
  const hit  = cacheGet(key);
  if (hit) { logger.info(`AI cache hit: dept:${department}`); return { ...hit, cached: true }; }

  logger.info(`AI orchestrate: department=${department}`);

  const context = await fetchDepartmentContext(department);
  if (!context) return { error: "No data found for the specified department" };

  const userPrompt = buildUserPrompt("department_risk", context, userQuestion);

  let aiResult;
  try {
    aiResult = await callLLM(SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    logger.warn(`AI call failed (${err.message}), using fallback`);
    aiResult = buildFallback("department_risk", context);
  }

  const result = { ...aiResult, context_used: context };
  cacheSet(key, result);
  return result;
}

/**
 * Orchestrate an individual employee insight
 */
async function analyzeEmployee(employeeId, userQuestion = null) {
  const key = cacheKey({ type: "emp", employeeId, q: userQuestion });
  const hit  = cacheGet(key);
  if (hit) { logger.info(`AI cache hit: emp:${employeeId}`); return { ...hit, cached: true }; }

  logger.info(`AI orchestrate: employee=${employeeId}`);

  const context = await fetchEmployeeContext(employeeId);
  if (!context) return { error: "Employee not found or no data available" };

  const userPrompt = buildUserPrompt("employee_insight", context, userQuestion);

  let aiResult;
  try {
    aiResult = await callLLM(SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    logger.warn(`AI call failed (${err.message}), using fallback`);
    aiResult = buildFallback("employee_insight", context);
  }

  const result = { ...aiResult, context_used: context };
  cacheSet(key, result);
  return result;
}

/**
 * Orchestrate a free-form organization-level query
 */
async function handleQuery(userQuestion, filters = {}) {
  const key = cacheKey({ type: "query", q: userQuestion, filters });
  const hit  = cacheGet(key);
  if (hit) { logger.info(`AI cache hit: query`); return { ...hit, cached: true }; }

  logger.info(`AI orchestrate: free query="${userQuestion.slice(0, 60)}"`);

  // Route to more specific context if department hint is present
  let context;
  if (filters.department) {
    context = await fetchDepartmentContext(filters.department);
  } else {
    context = await fetchOrganizationContext();
  }

  if (!context) return { error: "Unable to load organizational context" };

  const userPrompt = buildUserPrompt("general_query", context, userQuestion);

  let aiResult;
  try {
    aiResult = await callLLM(SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    logger.warn(`AI call failed (${err.message}), using fallback`);
    aiResult = buildFallback("general_query", context);
  }

  const result = { ...aiResult, context_used: context };
  cacheSet(key, result);
  return result;
}

/**
 * Invalidate cache entries for a specific scope
 */
function invalidateCache(scope = "all") {
  if (scope === "all") { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.startsWith(scope)) cache.delete(key);
  }
}

module.exports = {
  analyzeDepartment,
  analyzeEmployee,
  handleQuery,
  invalidateCache,
  // Expose for monitoring
  getCacheStats: () => ({ size: cache.size, maxSize: 200 }),
};
