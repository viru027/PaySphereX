"""Generate realistic sample CSV data for PaySphereX"""
import csv, random, uuid
from datetime import date, timedelta

random.seed(42)

departments = ['Engineering','HR','Finance','Marketing','Operations','Sales','Product','Legal']
titles = {
    'Engineering': ['Software Engineer','Senior Engineer','Tech Lead','DevOps Engineer'],
    'HR': ['HR Executive','HR Manager','Recruiter','HR Business Partner'],
    'Finance': ['Financial Analyst','Accountant','CFO','Finance Manager'],
    'Marketing': ['Marketing Executive','Brand Manager','Digital Marketer','Content Writer'],
    'Operations': ['Operations Manager','Operations Analyst','Process Engineer','Supply Chain'],
    'Sales': ['Sales Executive','Sales Manager','Business Developer','Account Manager'],
    'Product': ['Product Manager','Product Analyst','UX Designer','Business Analyst'],
    'Legal': ['Legal Counsel','Compliance Officer','Contract Manager','Paralegal'],
}
first_names = ['Aarav','Priya','Vikram','Sunita','Rahul','Ananya','Rohan','Neha','Amit','Kavya',
               'Siddharth','Divya','Karan','Sneha','Arjun','Pooja','Rajesh','Meera','Aditya','Shruti']
last_names = ['Sharma','Patel','Singh','Kumar','Mehta','Joshi','Nair','Iyer','Verma','Gupta',
              'Reddy','Rao','Desai','Shah','Malhotra','Chopra','Agarwal','Bose','Sinha','Mishra']

# Employees
emp_rows = [['id','employee_code','first_name','last_name','email','phone','department','job_title',
             'hire_date','status','base_salary','hra','ta','da','role','gender','date_of_birth']]
emp_ids = []
for i in range(1, 51):
    eid = str(uuid.uuid4())
    emp_ids.append(eid)
    dept = random.choice(departments)
    fname = random.choice(first_names)
    lname = random.choice(last_names)
    hire = date(random.randint(2018,2023), random.randint(1,12), random.randint(1,28))
    base = random.randint(40000, 180000)
    dob = date(random.randint(1985,2000), random.randint(1,12), random.randint(1,28))
    emp_rows.append([
        eid, f'EMP{i:04d}', fname, lname,
        f'{fname.lower()}.{lname.lower()}{i}@paysphere.com',
        f'+91-9{random.randint(100000000,999999999)}',
        dept, random.choice(titles[dept]),
        hire.isoformat(), 'Active', base,
        int(base * 0.20), int(base * 0.10), int(base * 0.05),
        'admin' if i == 1 else 'employee',
        random.choice(['Male','Female']), dob.isoformat()
    ])

with open('/home/claude/PaySphereX/data_science/data/raw/employees.csv','w',newline='') as f:
    csv.writer(f).writerows(emp_rows)

# Attendance (last 90 days)
att_rows = [['employee_id','attendance_date','check_in','check_out','work_hours','status','location']]
today = date.today()
statuses = ['Present']*15 + ['WFH']*5 + ['Absent']*2 + ['Half-Day']*1
locs = ['Office','WFH','Field']
for eid in emp_ids:
    for d in range(90, 0, -1):
        dt = today - timedelta(days=d)
        if dt.weekday() >= 5: continue
        st = random.choice(statuses)
        if st in ('Present','WFH','Half-Day'):
            ci_h = random.randint(8,10); ci_m = random.randint(0,59)
            wh = random.uniform(4,9) if st == 'Half-Day' else random.uniform(7.5,10)
            co_h = ci_h + int(wh); co_m = random.randint(0,59)
            check_in  = f'{dt}T{ci_h:02d}:{ci_m:02d}:00+05:30'
            check_out = f'{dt}T{min(co_h,23):02d}:{co_m:02d}:00+05:30'
            att_rows.append([eid, dt.isoformat(), check_in, check_out, round(wh,2), st,
                             random.choice(locs)])
        else:
            att_rows.append([eid, dt.isoformat(), '', '', 0, st, ''])

with open('/home/claude/PaySphereX/data_science/data/raw/attendance.csv','w',newline='') as f:
    csv.writer(f).writerows(att_rows)

# Payroll (last 6 months)
pay_rows = [['employee_id','payroll_month','payroll_year','base_salary','hra','ta','da',
             'performance_bonus','gross_salary','pf_deduction','esi_deduction',
             'income_tax','net_salary','status']]
for eid in emp_ids:
    base = random.randint(40000, 180000)
    for mo in range(1, 7):
        hra = int(base * 0.20); ta = int(base * 0.10); da = int(base * 0.05)
        bonus = random.randint(0, int(base * 0.15))
        gross = base + hra + ta + da + bonus
        pf = int(base * 0.12); esi = int(gross * 0.0175)
        tax = int(gross * 0.10) if gross > 50000 else 0
        net = gross - pf - esi - tax
        pay_rows.append([eid, mo, 2025, base, hra, ta, da, bonus, gross, pf, esi, tax, net, 'Paid'])

with open('/home/claude/PaySphereX/data_science/data/raw/payroll.csv','w',newline='') as f:
    csv.writer(f).writerows(pay_rows)

# Leave applications
leave_rows = [['employee_id','leave_type','start_date','end_date','total_days','status','reason']]
leave_types = ['CL','SL','PL','UL']
reasons = ['Personal work','Not feeling well','Family function','Travel','Medical appointment']
for eid in emp_ids:
    for _ in range(random.randint(1, 6)):
        start = today - timedelta(days=random.randint(1,180))
        days = random.randint(1,5)
        end = start + timedelta(days=days-1)
        leave_rows.append([eid, random.choice(leave_types), start.isoformat(),
                           end.isoformat(), days,
                           random.choice(['Approved','Pending','Rejected']),
                           random.choice(reasons)])

with open('/home/claude/PaySphereX/data_science/data/raw/leaves.csv','w',newline='') as f:
    csv.writer(f).writerows(leave_rows)

print(f"Generated: {len(emp_ids)} employees, {len(att_rows)-1} attendance, {len(pay_rows)-1} payroll, {len(leave_rows)-1} leaves")
