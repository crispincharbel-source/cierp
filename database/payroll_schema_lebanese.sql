-- ═══════════════════════════════════════════════════════════════
--  CI ERP — Lebanese Payroll Schema (PostgreSQL)
--  Compliant with: Lebanese Labour Law, NSSF 2024 Rates
-- ═══════════════════════════════════════════════════════════════

-- ─── Payroll Configuration ───────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_config (
    id                          VARCHAR(36) PRIMARY KEY,
    tenant_id                   VARCHAR(100) NOT NULL DEFAULT 'cierp',
    -- NSSF Rates (Lebanese 2024)
    nssf_employee_rate          NUMERIC(8,4)  NOT NULL DEFAULT 2.0000,   -- 2% employee
    nssf_employer_health_rate   NUMERIC(8,4)  NOT NULL DEFAULT 21.5000,  -- 21.5% health
    nssf_employer_family_rate   NUMERIC(8,4)  NOT NULL DEFAULT 6.0000,   -- 6% family
    nssf_employer_end_service_rate NUMERIC(8,4) NOT NULL DEFAULT 8.5000, -- 8.5% indemnity
    -- Transport
    daily_transport_allowance   NUMERIC(12,4) NOT NULL DEFAULT 32000,    -- LBP/day
    max_transport_allowance_days INT          NOT NULL DEFAULT 22,
    -- Exchange rate (official or market)
    exchange_rate_usd           NUMERIC(16,4) NOT NULL DEFAULT 89500,
    currency                    VARCHAR(10)   NOT NULL DEFAULT 'LBP',
    seniority_increment_rate    NUMERIC(8,4)  NOT NULL DEFAULT 3.0000,   -- % per year
    notes                       TEXT,
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    is_deleted                  BOOLEAN       NOT NULL DEFAULT FALSE
);

-- ─── Income Tax Brackets (Lebanese) ──────────────────────────
-- Applied on ANNUAL GROSS in LBP
-- Ministry of Finance 2024 schedule
-- Bracket 1:   0  – 18,000,000 LBP/year  →  2%
-- Bracket 2:  18M –  45,000,000          →  4%
-- Bracket 3:  45M –  90,000,000          →  7%
-- Bracket 4:  90M – 180,000,000          → 11%
-- Bracket 5: 180M – 360,000,000          → 15%
-- Bracket 6: 360M – 720,000,000          → 20%
-- Bracket 7: 720M+                        → 25%
-- (Implemented in service layer: app/modules/payroll/service.py)

-- ─── Payroll Entry (Monthly per employee) ────────────────────
CREATE TABLE IF NOT EXISTS payroll_entry (
    id                          VARCHAR(36) PRIMARY KEY,
    tenant_id                   VARCHAR(100) NOT NULL DEFAULT 'cierp',
    employee_id                 VARCHAR(36)  NOT NULL,
    employee_name               VARCHAR(200),
    department_id               VARCHAR(36),
    period_year                 INTEGER      NOT NULL,
    period_month                INTEGER      NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_label                VARCHAR(50),
    -- Earnings
    basic_salary                NUMERIC(20,4) NOT NULL DEFAULT 0,
    cost_of_living              NUMERIC(20,4) NOT NULL DEFAULT 0,  -- COLA
    transport_allowance         NUMERIC(20,4) NOT NULL DEFAULT 0,
    housing_allowance           NUMERIC(20,4) NOT NULL DEFAULT 0,
    meal_allowance              NUMERIC(20,4) NOT NULL DEFAULT 0,
    phone_allowance             NUMERIC(20,4) NOT NULL DEFAULT 0,
    overtime_amount             NUMERIC(20,4) NOT NULL DEFAULT 0,
    bonus                       NUMERIC(20,4) NOT NULL DEFAULT 0,
    other_allowances            NUMERIC(20,4) NOT NULL DEFAULT 0,
    gross_pay                   NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Deductions
    nssf_employee               NUMERIC(20,4) NOT NULL DEFAULT 0,  -- 2%
    income_tax                  NUMERIC(20,4) NOT NULL DEFAULT 0,  -- Lebanese brackets
    absence_deduction           NUMERIC(20,4) NOT NULL DEFAULT 0,
    advance_deduction           NUMERIC(20,4) NOT NULL DEFAULT 0,
    other_deductions            NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_deductions            NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Employer Contributions (not deducted from employee)
    nssf_employer_health        NUMERIC(20,4) NOT NULL DEFAULT 0,  -- 21.5%
    nssf_employer_family        NUMERIC(20,4) NOT NULL DEFAULT 0,  -- 6%
    nssf_employer_end_service   NUMERIC(20,4) NOT NULL DEFAULT 0,  -- 8.5%
    total_employer_contribution NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Net
    net_pay                     NUMERIC(20,4) NOT NULL DEFAULT 0,
    currency                    VARCHAR(10)   NOT NULL DEFAULT 'USD',
    working_days                INTEGER       NOT NULL DEFAULT 22,
    absent_days                 INTEGER       NOT NULL DEFAULT 0,
    overtime_hours              NUMERIC(8,2)  NOT NULL DEFAULT 0,
    state                       VARCHAR(30)   NOT NULL DEFAULT 'draft', -- draft|confirmed|paid
    payment_date                TIMESTAMPTZ,
    bank_account                VARCHAR(100),
    notes                       TEXT,
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    is_deleted                  BOOLEAN       NOT NULL DEFAULT FALSE,
    UNIQUE (tenant_id, employee_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_entry_employee ON payroll_entry (employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entry_period ON payroll_entry (period_year, period_month);

-- ─── Payroll Batch ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_batch (
    id                          VARCHAR(36) PRIMARY KEY,
    tenant_id                   VARCHAR(100) NOT NULL DEFAULT 'cierp',
    name                        VARCHAR(200) NOT NULL,
    period_year                 INTEGER      NOT NULL,
    period_month                INTEGER      NOT NULL,
    state                       VARCHAR(30)  NOT NULL DEFAULT 'draft',
    total_gross                 NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_net                   NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_nssf_employee         NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_nssf_employer         NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_income_tax            NUMERIC(20,4) NOT NULL DEFAULT 0,
    employee_count              INTEGER       NOT NULL DEFAULT 0,
    currency                    VARCHAR(10)   NOT NULL DEFAULT 'USD',
    notes                       TEXT,
    created_by                  VARCHAR(200),
    confirmed_by                VARCHAR(200),
    confirmed_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    is_deleted                  BOOLEAN       NOT NULL DEFAULT FALSE
);

-- ─── Employee Advance ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_advance (
    id                  VARCHAR(36) PRIMARY KEY,
    tenant_id           VARCHAR(100) NOT NULL DEFAULT 'cierp',
    employee_id         VARCHAR(36)  NOT NULL,
    employee_name       VARCHAR(200),
    amount              NUMERIC(20,4) NOT NULL,
    currency            VARCHAR(10)   NOT NULL DEFAULT 'USD',
    advance_date        TIMESTAMPTZ,
    reason              TEXT,
    state               VARCHAR(30)   NOT NULL DEFAULT 'pending',  -- pending|approved|recovered
    recovered_amount    NUMERIC(20,4) NOT NULL DEFAULT 0,
    monthly_recovery    NUMERIC(20,4) NOT NULL DEFAULT 0,
    approved_by         VARCHAR(200),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    is_deleted          BOOLEAN       NOT NULL DEFAULT FALSE
);

-- ─── End of Service (Lebanese Indemnity) ─────────────────────
CREATE TABLE IF NOT EXISTS end_of_service (
    id                              VARCHAR(36) PRIMARY KEY,
    tenant_id                       VARCHAR(100) NOT NULL DEFAULT 'cierp',
    employee_id                     VARCHAR(36)  NOT NULL,
    employee_name                   VARCHAR(200),
    hire_date                       TIMESTAMPTZ,
    termination_date                TIMESTAMPTZ,
    years_of_service                NUMERIC(8,2) NOT NULL DEFAULT 0,
    last_basic_salary               NUMERIC(20,4) NOT NULL DEFAULT 0,
    -- Lebanese Art.54: 1 month salary × years
    indemnity_amount                NUMERIC(20,4) NOT NULL DEFAULT 0,
    nssf_end_service_accumulated    NUMERIC(20,4) NOT NULL DEFAULT 0,
    total_payout                    NUMERIC(20,4) NOT NULL DEFAULT 0,
    currency                        VARCHAR(10)   NOT NULL DEFAULT 'USD',
    termination_reason              VARCHAR(100),  -- resignation|mutual|dismissal|end_contract
    state                           VARCHAR(30)   NOT NULL DEFAULT 'draft',
    notes                           TEXT,
    created_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    is_deleted                      BOOLEAN       NOT NULL DEFAULT FALSE
);

-- ─── Sample Lebanese Tax Reference Data ──────────────────────
COMMENT ON TABLE payroll_entry IS 
'Lebanese payroll: NSSF 2% employee / 21.5%+6%+8.5% employer. Income tax via progressive brackets.';

COMMENT ON COLUMN payroll_entry.nssf_employee IS 
'NSSF employee share: 2% on (basic_salary + cost_of_living)';

COMMENT ON COLUMN payroll_entry.nssf_employer_health IS 
'NSSF employer health & maternity: 21.5% on (basic_salary + cost_of_living)';

COMMENT ON COLUMN payroll_entry.nssf_employer_family IS 
'NSSF family allocation: 6% on basic_salary';

COMMENT ON COLUMN payroll_entry.nssf_employer_end_service IS 
'NSSF end of service reserve: 8.5% on basic_salary';

COMMENT ON COLUMN payroll_entry.income_tax IS 
'Lebanese progressive income tax (LBP brackets converted to salary currency)';

COMMENT ON TABLE end_of_service IS 
'Lebanese indemnity per Art.54 Labour Law: 1 month last basic salary per year of service';
