const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function resetPasswords() {
  const hash = await bcrypt.hash("Password@123", 12);
  await pool.query("UPDATE employees SET password_hash = $1", [hash]);
  console.log("✅ All employee passwords reset to: Password@123");
  await pool.end();
}

resetPasswords().catch(console.error);