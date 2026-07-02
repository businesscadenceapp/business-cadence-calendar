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
export const INDUSTRY_MEETING_DAY_DEFAULTS: Record<IndustryType, {
  ownerDaily: number[];  // days of week for owner daily huddle (multi-select)
  ownerWeekly: number;   // day of week for owner weekly
  ownerMonthly: number;  // day of week for owner monthly (first occurrence)
  quarterlyDay: number;  // day of week for quarterly offsite (first occurrence in Jan/Apr/Jul/Oct)
  teamDaily: number[];   // days of week for team daily huddle (multi-select)
  teamWeekly: number;    // day of week for team weekly
}> = {
  healthcare:   { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3 },
  fitness:      { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3 },
  realestate:   { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 2 },
  retail:       { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3 },
  restaurant:   { ownerDaily: [2, 3, 4, 5], ownerWeekly: 2, ownerMonthly: 2, quarterlyDay: 5, teamDaily: [2], teamWeekly: 4 },
  professional: { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3 },
  construction: { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 4 },
  salon:        { ownerDaily: [2, 3, 4, 5], ownerWeekly: 2, ownerMonthly: 2, quarterlyDay: 5, teamDaily: [2], teamWeekly: 4 },
  other:        { ownerDaily: [1, 2, 3, 4], ownerWeekly: 5, ownerMonthly: 5, quarterlyDay: 5, teamDaily: [1], teamWeekly: 3 },
};
