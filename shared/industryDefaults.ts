/**
 * Industry-specific default agenda items for each meeting cadence.
 * Used during onboarding to pre-populate agenda templates based on business type.
 */

export const INDUSTRY_TYPES = [
  { value: "healthcare", label: "Healthcare / Medical", description: "Chiropractic, dental, therapy, medical practice" },
  { value: "fitness", label: "Fitness & Wellness", description: "Gym, CrossFit, yoga studio, personal training" },
  { value: "realestate", label: "Real Estate", description: "Brokerage, property management, rental portfolio" },
  { value: "retail", label: "Retail / E-commerce", description: "Storefront, online shop, product-based business" },
  { value: "restaurant", label: "Restaurant / Food Service", description: "Restaurant, café, catering, food truck" },
  { value: "professional", label: "Professional Services", description: "Accounting, law, consulting, marketing agency" },
  { value: "construction", label: "Construction / Trades", description: "General contractor, plumbing, electrical, HVAC" },
  { value: "salon", label: "Salon / Spa / Beauty", description: "Hair salon, day spa, nail studio, barbershop" },
  { value: "other", label: "Other", description: "Custom business type" },
] as const;

export type IndustryType = (typeof INDUSTRY_TYPES)[number]["value"];

export type AgendaDefaults = {
  daily: string[];
  weekly: string[];
  monthly: string[];
  quarterly: string[];
};

// Owner-layer meeting agenda defaults per industry
export const OWNER_AGENDA_DEFAULTS: Record<IndustryType, AgendaDefaults> = {
  healthcare: {
    daily: [
      "Patient schedule review — any gaps to fill?",
      "Clinical concerns or urgent cases to discuss",
      "Staff coverage check",
      "Outstanding follow-ups from yesterday",
    ],
    weekly: [
      "New patient count vs. goal",
      "Re-exam and report of findings conversions",
      "Schedule fill rate and open slots",
      "Collections and outstanding insurance claims",
      "Staff performance or issues",
      "Marketing and referral sources",
      "Upcoming events or closures",
    ],
    monthly: [
      "Revenue vs. monthly goal",
      "New patient acquisition cost and sources",
      "Patient retention and visit averages",
      "Overhead review (payroll, supplies, rent)",
      "Team morale and HR items",
      "Equipment maintenance or upgrades needed",
      "30-day action plan review",
    ],
    quarterly: [
      "90-day revenue and growth review",
      "Patient volume trends and capacity planning",
      "Marketing ROI and channel review",
      "Team structure and hiring needs",
      "Technology and systems audit",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },

  fitness: {
    daily: [
      "Class attendance and open spots",
      "Member check-ins or concerns",
      "Coach coverage and scheduling",
      "Equipment issues or maintenance",
    ],
    weekly: [
      "Active membership count vs. goal",
      "New member sign-ups and trials",
      "Cancellations and reasons",
      "Class attendance averages",
      "Revenue and collections",
      "Upcoming events or programming changes",
      "Staff performance and coaching quality",
    ],
    monthly: [
      "Monthly revenue vs. goal",
      "Membership retention rate",
      "New member acquisition and marketing spend",
      "Merchandise and supplement sales",
      "Facility maintenance and upgrades",
      "Community events and competitions",
      "30-day action plan review",
    ],
    quarterly: [
      "90-day membership and revenue review",
      "Programming and coaching quality assessment",
      "Marketing and social media performance",
      "Competitive landscape review",
      "Equipment investment needs",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },

  realestate: {
    daily: [
      "Active listings and showings scheduled",
      "Pending deals and timeline check",
      "Tenant or property issues",
      "Leads and follow-ups due today",
    ],
    weekly: [
      "Active listings status and price adjustments",
      "Offers received or submitted",
      "Closings scheduled this week",
      "Lead pipeline and conversion rate",
      "Rental income collected vs. expected",
      "Maintenance requests and vendor coordination",
      "Marketing and open house results",
    ],
    monthly: [
      "Monthly GCI (gross commission income)",
      "Closed transactions vs. goal",
      "Rental portfolio net income",
      "Vacancy rate and lease renewals",
      "Marketing spend and lead sources",
      "Referral partner relationships",
      "30-day pipeline forecast",
    ],
    quarterly: [
      "90-day production and income review",
      "Portfolio value and equity assessment",
      "Market conditions and pricing trends",
      "Investment property acquisition targets",
      "Team and assistant needs",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },

  retail: {
    daily: [
      "Yesterday's sales vs. target",
      "Inventory alerts and low-stock items",
      "Staff coverage and open shifts",
      "Customer feedback or issues",
    ],
    weekly: [
      "Weekly sales vs. goal",
      "Top-selling and slow-moving products",
      "Inventory reorder needs",
      "Online store performance",
      "Marketing campaigns and promotions",
      "Customer acquisition and repeat rate",
      "Staff performance and scheduling",
    ],
    monthly: [
      "Monthly revenue and gross margin",
      "Inventory turnover and shrinkage",
      "Customer acquisition cost and LTV",
      "Marketing ROI by channel",
      "Vendor relationships and pricing",
      "Seasonal planning and buying",
      "30-day action plan review",
    ],
    quarterly: [
      "90-day sales and margin review",
      "Product line performance and pruning",
      "Seasonal inventory strategy",
      "Marketing and brand positioning",
      "Technology and POS systems",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },

  restaurant: {
    daily: [
      "Reservations and expected covers",
      "Inventory and prep needs",
      "Staff coverage and any call-outs",
      "Equipment or facility issues",
    ],
    weekly: [
      "Weekly revenue vs. goal",
      "Food cost percentage",
      "Labor cost percentage",
      "Table turns and average check",
      "Waste and over-prep review",
      "Staff performance and scheduling",
      "Upcoming events or specials",
    ],
    monthly: [
      "Monthly P&L review",
      "Food and beverage cost trends",
      "Labor efficiency and scheduling optimization",
      "Customer reviews and reputation management",
      "Vendor pricing and contract review",
      "Menu performance and adjustments",
      "30-day action plan review",
    ],
    quarterly: [
      "90-day revenue and profitability review",
      "Menu engineering and pricing strategy",
      "Seasonal menu planning",
      "Marketing and community presence",
      "Team culture and retention",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },

  professional: {
    daily: [
      "Client deliverables due today",
      "Urgent client communications",
      "Billing and time entries to log",
      "Team capacity check",
    ],
    weekly: [
      "Active client project status",
      "New business pipeline and proposals",
      "Billable hours vs. target",
      "Collections and outstanding invoices",
      "Team workload and capacity",
      "Deadlines and deliverables this week",
      "Client satisfaction check-ins",
    ],
    monthly: [
      "Monthly revenue and collections",
      "Client retention and churn",
      "New client acquisition and pipeline",
      "Utilization rate and profitability by client",
      "Team performance and development",
      "Systems and process improvements",
      "30-day action plan review",
    ],
    quarterly: [
      "90-day revenue and growth review",
      "Client portfolio health and concentration risk",
      "Service offering and pricing review",
      "Marketing and thought leadership",
      "Team hiring and development needs",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },

  construction: {
    daily: [
      "Active job sites — status and issues",
      "Crew assignments and coverage",
      "Material deliveries expected today",
      "Safety incidents or near-misses",
    ],
    weekly: [
      "Job progress vs. schedule on active projects",
      "Labor hours and cost tracking",
      "Material costs and procurement",
      "Subcontractor coordination",
      "New bids submitted and pending",
      "Change orders and scope adjustments",
      "Cash flow and receivables",
    ],
    monthly: [
      "Monthly revenue and job profitability",
      "Backlog and pipeline review",
      "Equipment maintenance and utilization",
      "Safety record and compliance",
      "Subcontractor relationships and pricing",
      "Estimating accuracy review",
      "30-day action plan review",
    ],
    quarterly: [
      "90-day revenue and backlog review",
      "Job costing and margin analysis",
      "Bonding capacity and insurance review",
      "Equipment investment needs",
      "Team structure and hiring",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },

  salon: {
    daily: [
      "Appointment book and open slots",
      "Stylist/technician coverage",
      "Product inventory check",
      "Client feedback or concerns",
    ],
    weekly: [
      "Weekly revenue vs. goal",
      "Service ticket average",
      "Retail product sales",
      "New client bookings and referrals",
      "Rebooking rate",
      "Staff performance and scheduling",
      "Upcoming promotions or events",
    ],
    monthly: [
      "Monthly revenue and service mix",
      "Client retention and visit frequency",
      "Retail sales and product margins",
      "Staff productivity and commission review",
      "Marketing and social media performance",
      "Supply costs and vendor review",
      "30-day action plan review",
    ],
    quarterly: [
      "90-day revenue and growth review",
      "Service menu and pricing review",
      "Staff training and education investment",
      "Client loyalty program performance",
      "Facility upgrades and equipment",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },

  other: {
    daily: [
      "Top priority for today",
      "Urgent customer or client issues",
      "Team coverage and capacity",
      "Outstanding items from yesterday",
    ],
    weekly: [
      "Revenue vs. weekly goal",
      "Customer/client pipeline",
      "Key metrics review",
      "Team performance and issues",
      "Marketing and sales activity",
      "Operational issues to address",
      "Upcoming deadlines or events",
    ],
    monthly: [
      "Monthly revenue and profitability",
      "Customer acquisition and retention",
      "Key performance indicators review",
      "Expense and overhead review",
      "Team development and HR",
      "Systems and process improvements",
      "30-day action plan review",
    ],
    quarterly: [
      "90-day performance review",
      "Business health and key metrics",
      "Strategic priorities and progress",
      "Market and competitive landscape",
      "Team structure and hiring needs",
      "Owner compensation and profit distribution",
      "Next quarter goals and priorities",
      "Personal and business vision alignment",
    ],
  },
};

// Team-layer meeting agenda defaults per industry
export const TEAM_AGENDA_DEFAULTS: Record<IndustryType, AgendaDefaults> = {
  healthcare: {
    daily: [
      "Today's schedule and patient count",
      "Any clinical or front desk concerns",
      "Team announcements",
    ],
    weekly: [
      "Weekly patient volume recap",
      "Protocol or procedure updates",
      "Scheduling and front desk issues",
      "Team wins and shoutouts",
      "Upcoming closures or schedule changes",
    ],
    monthly: [
      "Monthly team performance recap",
      "Patient satisfaction and feedback",
      "Training and continuing education",
      "Policy or procedure updates",
      "Team goals for next month",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Training and development plans",
      "Process improvement ideas from staff",
      "Recognition and rewards",
    ],
  },

  fitness: {
    daily: [
      "Today's class schedule and attendance",
      "Any member concerns or issues",
      "Coach announcements",
    ],
    weekly: [
      "Weekly class attendance recap",
      "Member feedback and concerns",
      "Programming updates",
      "Team wins and shoutouts",
      "Upcoming events or schedule changes",
    ],
    monthly: [
      "Monthly membership and retention update",
      "Community events and competitions",
      "Coaching quality and development",
      "Facility and equipment updates",
      "Team goals for next month",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Coach development and certifications",
      "Community feedback and ideas",
      "Recognition and rewards",
    ],
  },

  realestate: {
    daily: [
      "Today's showings and appointments",
      "Urgent client communications",
      "Team announcements",
    ],
    weekly: [
      "Active listings and deal updates",
      "Lead follow-up accountability",
      "Team wins and shoutouts",
      "Market updates and trends",
      "Upcoming closings and deadlines",
    ],
    monthly: [
      "Monthly production recap",
      "Team training and skill development",
      "Marketing and lead generation review",
      "Client experience improvements",
      "Team goals for next month",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Professional development plans",
      "Process improvement ideas",
      "Recognition and rewards",
    ],
  },

  retail: {
    daily: [
      "Today's sales targets and promotions",
      "Inventory alerts",
      "Team announcements",
    ],
    weekly: [
      "Weekly sales recap",
      "Customer feedback and issues",
      "Merchandising and display updates",
      "Team wins and shoutouts",
      "Upcoming promotions or events",
    ],
    monthly: [
      "Monthly sales and performance recap",
      "Product knowledge training",
      "Customer service improvements",
      "Team goals for next month",
      "Recognition and rewards",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Training and development plans",
      "Process improvement ideas from staff",
      "Recognition and rewards",
    ],
  },

  restaurant: {
    daily: [
      "Today's reservations and specials",
      "Prep and inventory needs",
      "Team announcements",
    ],
    weekly: [
      "Weekly service recap",
      "Menu updates and specials",
      "Customer feedback and reviews",
      "Team wins and shoutouts",
      "Upcoming events or schedule changes",
    ],
    monthly: [
      "Monthly performance recap",
      "Food safety and compliance review",
      "Team training and development",
      "Customer experience improvements",
      "Team goals for next month",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Training and development plans",
      "Process improvement ideas from staff",
      "Recognition and rewards",
    ],
  },

  professional: {
    daily: [
      "Today's client deliverables and deadlines",
      "Urgent items to flag",
      "Team announcements",
    ],
    weekly: [
      "Project status updates",
      "Client feedback and concerns",
      "Workload and capacity check",
      "Team wins and shoutouts",
      "Upcoming deadlines and milestones",
    ],
    monthly: [
      "Monthly project and client recap",
      "Team training and skill development",
      "Process and workflow improvements",
      "Team goals for next month",
      "Recognition and rewards",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Professional development plans",
      "Process improvement ideas from staff",
      "Recognition and rewards",
    ],
  },

  construction: {
    daily: [
      "Today's job site assignments",
      "Safety briefing",
      "Material and equipment needs",
    ],
    weekly: [
      "Job site progress updates",
      "Safety incidents or near-misses",
      "Material and supply issues",
      "Team wins and shoutouts",
      "Upcoming schedule and deadlines",
    ],
    monthly: [
      "Monthly project recap",
      "Safety training and compliance",
      "Equipment and tool maintenance",
      "Team goals for next month",
      "Recognition and rewards",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Training and certification updates",
      "Process improvement ideas from field",
      "Recognition and rewards",
    ],
  },

  salon: {
    daily: [
      "Today's appointment book",
      "Product and supply needs",
      "Team announcements",
    ],
    weekly: [
      "Weekly service and retail recap",
      "Client feedback and concerns",
      "Scheduling and booking updates",
      "Team wins and shoutouts",
      "Upcoming promotions or events",
    ],
    monthly: [
      "Monthly performance recap",
      "Education and technique training",
      "Client retention strategies",
      "Team goals for next month",
      "Recognition and rewards",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Education and development plans",
      "Process improvement ideas from staff",
      "Recognition and rewards",
    ],
  },

  other: {
    daily: [
      "Today's priorities",
      "Urgent items to flag",
      "Team announcements",
    ],
    weekly: [
      "Weekly performance recap",
      "Customer or client feedback",
      "Team wins and shoutouts",
      "Operational issues",
      "Upcoming deadlines or events",
    ],
    monthly: [
      "Monthly performance recap",
      "Team training and development",
      "Process improvements",
      "Team goals for next month",
      "Recognition and rewards",
    ],
    quarterly: [
      "Quarterly business update (owner-shared highlights)",
      "Team culture and morale check",
      "Development and training plans",
      "Process improvement ideas from staff",
      "Recognition and rewards",
    ],
  },
};

/** Default preferred meeting days by industry (0=Sun, 1=Mon, ..., 6=Sat) */
const ENABLED_DEFAULTS = {
  ownerDailyEnabled: true,
  ownerWeeklyEnabled: true,
  ownerMonthlyEnabled: true,
  quarterlyEnabled: true,
  teamDailyEnabled: true,
  teamWeeklyEnabled: true,
};

export const INDUSTRY_MEETING_DAY_DEFAULTS: Record<IndustryType, {
  ownerDaily: number[];  // days of week for owner daily huddle (multi-select)
  ownerWeekly: number;   // day of week for owner weekly
  ownerMonthly: number;  // day of week for owner monthly (first occurrence)
  quarterlyDay: number;  // day of week for quarterly offsite (first occurrence in Jan/Apr/Jul/Oct)
  teamDaily: number[];   // days of week for team daily huddle (multi-select)
  teamWeekly: number;    // day of week for team weekly
  ownerDailyEnabled: boolean;
  ownerWeeklyEnabled: boolean;
  ownerMonthlyEnabled: boolean;
  quarterlyEnabled: boolean;
  teamDailyEnabled: boolean;
  teamWeeklyEnabled: boolean;
}> = {
  healthcare:   { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3, ...ENABLED_DEFAULTS },
  fitness:      { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3, ...ENABLED_DEFAULTS },
  realestate:   { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 2, ...ENABLED_DEFAULTS },
  retail:       { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3, ...ENABLED_DEFAULTS },
  restaurant:   { ownerDaily: [2, 3, 4, 5], ownerWeekly: 2, ownerMonthly: 2, quarterlyDay: 5, teamDaily: [2], teamWeekly: 4, ...ENABLED_DEFAULTS },
  professional: { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3, ...ENABLED_DEFAULTS },
  construction: { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 4, ...ENABLED_DEFAULTS },
  salon:        { ownerDaily: [2, 3, 4, 5], ownerWeekly: 2, ownerMonthly: 2, quarterlyDay: 5, teamDaily: [2], teamWeekly: 4, ...ENABLED_DEFAULTS },
  other:        { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3, ...ENABLED_DEFAULTS },
};

// ─── Industry-specific suggested goals for onboarding ────────────────────────

export interface SuggestedGoal {
  label: string;
  metric: string;
  unit: string;
  example: string;
}

export const INDUSTRY_SUGGESTED_GOALS: Record<IndustryType, SuggestedGoal[]> = {
  healthcare: [
    { label: "Grow new patient volume", metric: "New patients per month", unit: "patients", example: "e.g. 30 new patients/month" },
    { label: "Increase visit average", metric: "Patient visit average", unit: "visits", example: "e.g. 24 visits per patient" },
    { label: "Hit revenue target", metric: "Monthly collections", unit: "$", example: "e.g. $50,000/month" },
    { label: "Improve retention rate", metric: "Patient retention %", unit: "%", example: "e.g. 80% retention" },
  ],
  fitness: [
    { label: "Grow membership base", metric: "Active members", unit: "members", example: "e.g. 150 active members" },
    { label: "Reduce cancellations", metric: "Monthly cancellations", unit: "members", example: "e.g. fewer than 5/month" },
    { label: "Hit revenue target", metric: "Monthly revenue", unit: "$", example: "e.g. $25,000/month" },
    { label: "Increase class attendance", metric: "Avg class attendance", unit: "members", example: "e.g. 12 per class" },
  ],
  realestate: [
    { label: "Close more transactions", metric: "Closings per month", unit: "closings", example: "e.g. 4 closings/month" },
    { label: "Grow listing inventory", metric: "Active listings", unit: "listings", example: "e.g. 10 active listings" },
    { label: "Hit GCI target", metric: "Gross commission income", unit: "$", example: "e.g. $20,000/month" },
    { label: "Build lead pipeline", metric: "New leads per week", unit: "leads", example: "e.g. 10 new leads/week" },
  ],
  retail: [
    { label: "Hit sales target", metric: "Monthly revenue", unit: "$", example: "e.g. $40,000/month" },
    { label: "Improve average order value", metric: "Average order value", unit: "$", example: "e.g. $65 per order" },
    { label: "Grow repeat customers", metric: "Repeat customer rate", unit: "%", example: "e.g. 35% repeat rate" },
    { label: "Reduce dead inventory", metric: "Inventory turnover", unit: "days", example: "e.g. sell through in 45 days" },
  ],
  restaurant: [
    { label: "Hit weekly revenue target", metric: "Weekly revenue", unit: "$", example: "e.g. $15,000/week" },
    { label: "Control food cost", metric: "Food cost %", unit: "%", example: "e.g. keep under 30%" },
    { label: "Control labor cost", metric: "Labor cost %", unit: "%", example: "e.g. keep under 35%" },
    { label: "Improve table turns", metric: "Avg table turns per night", unit: "turns", example: "e.g. 2.5 turns/night" },
  ],
  professional: [
    { label: "Hit monthly revenue", metric: "Monthly revenue", unit: "$", example: "e.g. $30,000/month" },
    { label: "Grow client base", metric: "Active clients", unit: "clients", example: "e.g. 20 active clients" },
    { label: "Improve billable utilization", metric: "Billable hours %", unit: "%", example: "e.g. 75% billable time" },
    { label: "Reduce outstanding invoices", metric: "AR over 30 days", unit: "$", example: "e.g. keep under $5,000" },
  ],
  construction: [
    { label: "Hit monthly revenue", metric: "Monthly revenue billed", unit: "$", example: "e.g. $80,000/month" },
    { label: "Maintain healthy backlog", metric: "Backlog value", unit: "$", example: "e.g. $300,000 in backlog" },
    { label: "Improve job margin", metric: "Average job gross margin", unit: "%", example: "e.g. 25% gross margin" },
    { label: "Win more bids", metric: "Bid win rate", unit: "%", example: "e.g. 40% win rate" },
  ],
  salon: [
    { label: "Hit weekly revenue target", metric: "Weekly revenue", unit: "$", example: "e.g. $8,000/week" },
    { label: "Improve rebooking rate", metric: "Rebooking rate", unit: "%", example: "e.g. 70% rebook" },
    { label: "Grow retail sales", metric: "Monthly retail revenue", unit: "$", example: "e.g. $1,500/month in retail" },
    { label: "Increase service ticket", metric: "Average service ticket", unit: "$", example: "e.g. $95 avg ticket" },
  ],
  other: [
    { label: "Hit monthly revenue", metric: "Monthly revenue", unit: "$", example: "e.g. $20,000/month" },
    { label: "Grow customer base", metric: "Active customers", unit: "customers", example: "e.g. 50 active customers" },
    { label: "Improve retention", metric: "Customer retention rate", unit: "%", example: "e.g. 80% retention" },
    { label: "Reduce costs", metric: "Monthly overhead", unit: "$", example: "e.g. keep under $8,000/month" },
  ],
};

// ─── Industry-specific KPI defaults for onboarding ───────────────────────────

export interface KpiDefault {
  name: string;
  unit: string;
  frequency: "weekly" | "monthly";
  description: string;
}

export const INDUSTRY_KPI_DEFAULTS: Record<IndustryType, KpiDefault[]> = {
  healthcare: [
    { name: "New Patients", unit: "patients", frequency: "weekly", description: "New patients seen for the first time this week" },
    { name: "Adjustments / Visits", unit: "visits", frequency: "weekly", description: "Total patient visits or adjustments performed" },
    { name: "Collections", unit: "$", frequency: "monthly", description: "Total revenue collected from patients and insurance" },
    { name: "Patient Visit Average", unit: "visits", frequency: "monthly", description: "Average number of visits per active patient" },
  ],
  fitness: [
    { name: "Active Members", unit: "members", frequency: "monthly", description: "Total paying members with active memberships" },
    { name: "New Sign-Ups", unit: "members", frequency: "monthly", description: "New members who joined this month" },
    { name: "Class Attendance", unit: "check-ins", frequency: "weekly", description: "Total class check-ins across all sessions" },
    { name: "Cancellations", unit: "members", frequency: "monthly", description: "Members who cancelled their membership" },
  ],
  realestate: [
    { name: "New Leads", unit: "leads", frequency: "weekly", description: "New buyer or seller leads generated this week" },
    { name: "Active Listings", unit: "listings", frequency: "monthly", description: "Properties currently listed for sale" },
    { name: "Closings", unit: "closings", frequency: "monthly", description: "Transactions closed and funded this month" },
    { name: "GCI", unit: "$", frequency: "monthly", description: "Gross commission income earned this month" },
  ],
  retail: [
    { name: "Revenue", unit: "$", frequency: "weekly", description: "Total sales revenue for the week" },
    { name: "Transactions", unit: "orders", frequency: "weekly", description: "Number of customer transactions completed" },
    { name: "Average Order Value", unit: "$", frequency: "monthly", description: "Average dollar amount per customer order" },
    { name: "Inventory Turns", unit: "turns", frequency: "monthly", description: "How many times inventory sells through per month" },
  ],
  restaurant: [
    { name: "Revenue", unit: "$", frequency: "weekly", description: "Total food and beverage revenue for the week" },
    { name: "Covers", unit: "guests", frequency: "weekly", description: "Total number of guests served" },
    { name: "Food Cost %", unit: "%", frequency: "monthly", description: "Food cost as a percentage of revenue (target: <30%)" },
    { name: "Labor Cost %", unit: "%", frequency: "monthly", description: "Labor cost as a percentage of revenue (target: <35%)" },
  ],
  professional: [
    { name: "Billable Hours", unit: "hrs", frequency: "weekly", description: "Hours billed to clients this week" },
    { name: "New Proposals", unit: "proposals", frequency: "monthly", description: "New client proposals submitted" },
    { name: "Revenue Collected", unit: "$", frequency: "monthly", description: "Invoices paid and collected this month" },
    { name: "Active Clients", unit: "clients", frequency: "monthly", description: "Clients with active engagements" },
  ],
  construction: [
    { name: "Revenue Billed", unit: "$", frequency: "monthly", description: "Invoices issued to clients for completed work" },
    { name: "Active Job Sites", unit: "sites", frequency: "weekly", description: "Number of job sites with active crews" },
    { name: "New Bids Submitted", unit: "bids", frequency: "monthly", description: "New project bids submitted to potential clients" },
    { name: "Backlog Value", unit: "$", frequency: "monthly", description: "Total value of contracted but unbilled work" },
  ],
  salon: [
    { name: "Revenue", unit: "$", frequency: "weekly", description: "Total service and retail revenue for the week" },
    { name: "Appointments", unit: "appts", frequency: "weekly", description: "Total appointments completed" },
    { name: "Rebooking Rate", unit: "%", frequency: "monthly", description: "Percentage of clients who rebooked before leaving" },
    { name: "Retail Sales", unit: "$", frequency: "monthly", description: "Product retail revenue this month" },
  ],
  other: [
    { name: "Revenue", unit: "$", frequency: "monthly", description: "Total revenue generated this month" },
    { name: "New Customers", unit: "customers", frequency: "monthly", description: "New customers acquired this month" },
    { name: "Tasks Completed", unit: "tasks", frequency: "weekly", description: "Key tasks or deliverables completed this week" },
    { name: "Customer Satisfaction", unit: "score", frequency: "monthly", description: "Average customer satisfaction rating (1–10)" },
  ],
};

// ─── Meeting cadence explanations ────────────────────────────────────────────

export interface MeetingTypeInfo {
  icon: string;
  title: string;
  duration: string;
  purpose: string;
  tip: string;
}

export const MEETING_TYPE_INFO: Record<string, MeetingTypeInfo> = {
  ownerDaily: {
    icon: "☀️",
    title: "Owner Daily Huddle",
    duration: "10–15 min",
    purpose: "A quick daily sync between owners to stay aligned, flag issues early, and set priorities for the day. Think of it as a standing check-in — not a full meeting.",
    tip: "Most owner teams do this 3–5 days a week. Even 10 minutes prevents a week of miscommunication.",
  },
  ownerWeekly: {
    icon: "📊",
    title: "Owner Weekly Review",
    duration: "60–90 min",
    purpose: "A deeper weekly review of your numbers, priorities, and issues. This is where you look at last week's performance and plan the week ahead together.",
    tip: "This is the most important meeting in your cadence. Owners who skip it tend to drift apart on priorities.",
  },
  ownerMonthly: {
    icon: "💰",
    title: "Monthly Finance Review",
    duration: "60 min",
    purpose: "A focused review of your monthly financials — revenue, expenses, margins, and cash flow. Keeps both owners fully informed on the business's financial health.",
    tip: "Schedule this for the first week of each month once you have the prior month's numbers closed.",
  },
  quarterly: {
    icon: "🧭",
    title: "Quarterly Offsite",
    duration: "3–4 hours",
    purpose: "A quarterly strategic session to review 90-day results, set new goals, and work on the business — not just in it. Often done off-site to get out of the day-to-day mindset.",
    tip: "Block a half-day away from the office. Even a coffee shop works. The change of scenery matters.",
  },
  teamDaily: {
    icon: "🤝",
    title: "Team Daily Huddle",
    duration: "10–15 min",
    purpose: "A quick morning stand-up with your full team. Everyone shares their top priority for the day and any blockers. Keeps the whole team aligned without long meetings.",
    tip: "Keep it standing and time-boxed. No problem-solving in the huddle — take it offline.",
  },
  teamWeekly: {
    icon: "📋",
    title: "Team Weekly Meeting",
    duration: "30–60 min",
    purpose: "A weekly all-hands or team review. Share business updates, celebrate wins, address issues, and align on the week's priorities. Builds team culture and accountability.",
    tip: "This is where you share the numbers with your team. Transparency builds trust and ownership.",
  },
};

// ─── Default meeting times per meeting type ───────────────────────────────────

export interface MeetingTimes {
  ownerDaily: string;    // "HH:MM" 24h
  ownerWeekly: string;
  ownerMonthly: string;
  quarterly: string;
  teamDaily: string;
  teamWeekly: string;
}

/** Sensible default start times for each meeting type. */
export const DEFAULT_MEETING_TIMES: MeetingTimes = {
  ownerDaily:   "08:00",  // 8:00 AM — quick morning sync before the day starts
  ownerWeekly:  "09:00",  // 9:00 AM — deeper weekly review
  ownerMonthly: "09:00",  // 9:00 AM — monthly finance review
  quarterly:    "09:00",  // 9:00 AM — quarterly offsite (half-day)
  teamDaily:    "08:30",  // 8:30 AM — team huddle after owner sync
  teamWeekly:   "09:00",  // 9:00 AM — all-hands weekly
};

/** Human-readable time options for the time picker (30-min increments, 6 AM – 7 PM). */
export const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 6; h <= 19; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const value = `${hh}:${mm}`;
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${mm} ${ampm}`;
      opts.push({ value, label });
    }
  }
  return opts;
})();

/** Format a "HH:MM" 24h string to "h:MM AM/PM" for display. */
export function formatMeetingTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${m} ${ampm}`;
}
