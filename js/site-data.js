/* Legacy Computing Services — editable site content.
   Change copy, prices, and lists here. The page markup in index.html does not need to change.
   Prices below are the figures already published on the previous single-page site. Do not add new prices in this file without the owner’s say-so.
   Search for "TODO(owner)" before launch. */
window.LCS_DATA = {
  company: {
    name: "Legacy Computing Services LLC",
    shortName: "Legacy Computing",
    legalLine: "Services LLC",
    mottoLead: "Protecting what matters.",
    mottoAccent: "Building what’s next.",
    motto: "Protecting what matters. Building what’s next.",
    email: "info@legacycomputingservices.com",
    domain: "legacycomputingservices.com",
    founder: "Scott James Kramer",
    founderLine: "Founded by Scott James Kramer",
    place: "Bel Air, Maryland",
    regionLabel: "Harford County, Maryland • Custom IT & Web Engineering",
    /* TODO(owner): seasonal line. Fine for late 2026; update it when Q1 ends. */
    accepting: "Accepting Q4 / Q1 Projects"
  },

  hero: {
    sub: "Bespoke web design, custom-engineered PC workstations, and dependable hardware upgrades built with enterprise-grade discipline for Maryland businesses and professionals.",
    primaryCta: "Request a Consultation",
    secondaryCta: "Explore Services"
  },

  pillars: [
    { code: "01 // DIGITAL PRESENCE", label: "Modern Web & Workspace", tone: "sky" },
    { code: "02 // BESPOKE HARDWARE", label: "Custom PC Workstations", tone: "amber" },
    { code: "03 // LIFECYCLE CARE", label: "Upgrades & Diagnostics", tone: "emerald" }
  ],

  highlights: [
    { title: "15+ Years Discipline", detail: "Systems & Security Rigor", view: "about", tone: "sky", icon: "shield" },
    { title: "100% Custom-Tailored", detail: "Zero Cookie-Cutter Builds", view: "services", tone: "amber", icon: "sliders" },
    { title: "Local Maryland Support", detail: "Bel Air & Harford County", view: "about", tone: "sky", icon: "pin" },
    { title: "Zero Bloatware Guarantee", detail: "Clean, Hardened Delivery", view: "services", tone: "emerald", icon: "check" }
  ],

  servicesPage: {
    eyebrow: "Core Capabilities",
    title: "Precision engineering across web, workstations, and hardware.",
    lede: "Whether modernizing your business’s digital storefront or building a whisper-quiet workstation from hand-selected components, every engagement is engineered for reliability."
  },

  services: [
    {
      id: "web",
      kicker: "PILLAR // 01",
      title: "Web Design & Digital Modernization",
      summary: "Fast, responsive, mobile-first websites for local businesses, organizations, and nonprofits—complete with domain & Google Workspace setup, SEO fundamentals, and hassle-free managed hosting without front-desk overhead.",
      tone: "sky",
      icon: "globe",
      inspectLabel: "Inspect Deliverables",
      estimateLabel: "Estimate →",
      /* TODO(owner): the old page jumped this card to the $1,450 redesign. It now opens the Starter Site (the “start here” tier). Confirm that default. */
      estimatorPreset: "web-starter",
      bullets: [
        "Mobile-first custom responsive web architecture",
        "Domain DNS, SSL security & Google Workspace email",
        "Local Harford County SEO & managed care plans"
      ],
      modal: {
        eyebrow: "Pillar 01 // Web Engineering",
        title: "Web Design & Digital Modernization",
        summary: "Built from the ground up for speed, clarity, and mobile usability—giving Maryland small businesses, nonprofits, and independent professionals an authoritative web presence without bloated agency retainers.",
        turnaround: "Typical Turnaround: 1–3 Weeks",
        standards: [
          "Custom mobile-first UI architecture with sub-second load speeds",
          "Full domain DNS configuration, HTTPS/SSL hardening & Google Workspace setup",
          "On-page local SEO schema for Bel Air & Harford County search visibility",
          "Accessible contact & lead routing without front-desk administrative overhead",
          "100% client ownership of domain, code, and digital assets"
        ]
      }
    },
    {
      id: "pc",
      kicker: "PILLAR // 02",
      title: "Custom PC Building & Workstations",
      summary: "Precision-assembled desktops tailored for gaming, content creation, CAD, and heavy multi-tasking—featuring vetted component selection, clean cable management, thermal stress-testing, and zero pre-installed bloatware.",
      tone: "amber",
      icon: "cpu",
      inspectLabel: "Inspect Build Protocol",
      estimateLabel: "Configure →",
      /* TODO(owner): the old page jumped this card to the $2,400 Creator / CAD tier. It now opens the Office & Productivity workstation. Confirm that default. */
      estimatorPreset: "pc-office",
      bullets: [
        "100% vetted retail parts with full manufacturer warranties",
        "Multi-hour CPU/GPU thermal burn-in & acoustic tuning",
        "Clean OS deployment, BIOS tuning & zero trialware"
      ],
      modal: {
        eyebrow: "Pillar 02 // Bespoke Systems",
        title: "Custom PC Building & Workstations",
        summary: "Every workstation is engineered around your exact software stack, acoustic expectations, and thermal envelope—using tier-one retail components and disciplined assembly practices.",
        turnaround: "Typical Turnaround: 5–10 Business Days",
        standards: [
          "Itemized Bill of Materials (BOM) with transparent component pricing",
          "Precision cable routing for unobstructed airflow and clean serviceability",
          "BIOS/UEFI firmware updates, XMP/EXPO memory validation & custom fan curves",
          "Multi-hour CPU/GPU thermal and stability burn-in testing prior to handoff",
          "Clean Windows / Linux installation with zero OEM bloatware or trialware"
        ]
      }
    },
    {
      id: "upgrade",
      kicker: "PILLAR // 03",
      title: "Hardware Upgrades & Diagnostics",
      summary: "Extend the life and speed of existing systems with NVMe SSD migrations, RAM expansions, GPU upgrades, thermal repasting, and thorough root-cause hardware diagnostics—saving you from premature replacement costs.",
      tone: "sky",
      icon: "wrench",
      inspectLabel: "Inspect Diagnostic Checklist",
      estimateLabel: "Estimate →",
      /* TODO(owner): the old page jumped this card to the NVMe/RAM upgrade. It now opens diagnostics first. Confirm that default. */
      estimatorPreset: "hw-diag",
      bullets: [
        "Seamless OS & data cloning to high-speed NVMe SSDs",
        "RAM capacity expansion, GPU & PSU compatibility upgrades",
        "Deep dust remediation, thermal repasting & stability testing"
      ],
      modal: {
        eyebrow: "Pillar 03 // Diagnostics & Lifecycle",
        title: "Hardware Upgrades & Diagnostics",
        summary: "Before replacing an aging desktop or laptop, let us diagnose the real bottleneck. Strategic NVMe storage, memory, and thermal upgrades often deliver like-new responsiveness at a fraction of replacement cost.",
        turnaround: "Typical Turnaround: 1–3 Business Days",
        standards: [
          "Bit-accurate OS & file cloning onto high-speed Gen4/Gen5 NVMe SSDs",
          "Dual-channel DDR4/DDR5 RAM upgrades & GPU/PSU power validation",
          "Complete internal dust extraction and high-performance thermal repasting",
          "SMART drive health audit, memory diagnostics & startup optimization",
          "Honest repair-vs-replace recommendation with clear upfront pricing"
        ]
      }
    }
  ],

  estimator: {
    eyebrow: "Interactive Scope Builder",
    title: "Configure Your Project",
    lede: "Select a service category and tier below to preview transparent starting scope, turnaround estimates, and key deliverables—then load your selection directly into the inquiry form.",
    mission: "Protecting what matters. Building what’s next.",
    /* TODO(owner): this note is the policy you asked to state (free consultation, no surprise fees, quote confirmed before any work).
       Confirm whether “consultation is free” includes on-site visits. The site already says on-site consultations are available in Harford & Baltimore Counties; it does not say those visits are free.
       Confirm the $95 diagnostic fee still applies toward later labor (see the diagnostics tier note). That credit should stay visible so the fee is not a surprise next to “no surprise fees.” */
    honestNote: "Consultation is free. Each tier shows a starting point and a range, what is included, and who it is for. We confirm the quote with you before any work begins. No surprise fees.",
    /* TODO(owner): confirm these published ranges. They are the existing budget hints, now shown next to the starting price. No new dollar amounts were added.
       PC bands say “Parts + Assembly” because that is how the previous page described them. Parts prices move; confirm you still want these bands public. */
    categories: [
      {
        id: "web",
        label: "Web Design & Modernization",
        /* TODO(owner): confirm this steering note and that Starter Site is the right “start here” tier. */
        notSure: "Not sure? Start here: Starter Site & Digital Launch, if you need a credible first website. Choose Full Business Redesign only when you already have more to publish or a site to replace. Managed Hosting & Workspace is care for a site that is already live, not a substitute for building one.",
        tiers: [
          {
            id: "web-starter",
            startHere: true,
            name: "Starter Site & Digital Launch",
            shortDesc: "Clean, high-converting single-page or 3-page launch site for new ventures.",
            fit: "Ideal for local service providers, consultants, and community organizations needing a credible online presence fast.",
            price: "$750+",
            turnaround: "Est. 1–2 Weeks",
            formValue: "Web Design — Starter Site",
            budgetHint: "$750–$1,200 • Launch in 1–2 weeks",
            deliverables: [
              "Custom mobile-responsive design",
              "Domain & SSL security setup",
              "Direct lead/contact form integration",
              "Google Business & local SEO basics",
              "Speed & Core Web Vitals optimization",
              "Full source & domain ownership"
            ],
            note: "Ideal for local service providers, consultants, and community organizations needing a credible online presence fast."
          },
          {
            id: "web-redesign",
            name: "Full Business Redesign",
            shortDesc: "Multi-page modern web platform tailored for established Maryland businesses.",
            fit: "Multi-page modern web platform tailored for established Maryland businesses.",
            price: "$1,450+",
            turnaround: "Est. 2–3 Weeks",
            formValue: "Web Design — Full Business Redesign",
            budgetHint: "$1,450–$2,800 • Launch in 2–3 weeks",
            deliverables: [
              "Up to 6 custom-engineered pages",
              "Interactive service & quote modules",
              "Google Workspace email migration",
              "Local Harford County SEO architecture",
              "Copy structure & brand modernization",
              "30-day post-launch priority support"
            ],
            note: "All domain registrations, hosting accounts, and source assets remain 100% owned by your business from day one."
          },
          {
            id: "web-managed",
            name: "Managed Hosting & Workspace",
            shortDesc: "Ongoing site updates, uptime monitoring, and Google Workspace administration.",
            fit: "Ongoing site updates, uptime monitoring, and Google Workspace administration.",
            price: "$95 / mo",
            turnaround: "Setup in 48 Hours",
            formValue: "Web Design — Managed Hosting & Google Workspace",
            budgetHint: "$95/mo Managed Plan • Immediate onboarding",
            deliverables: [
              "Managed cloud hosting & SSL renewal",
              "Monthly content & image updates",
              "Google Workspace user & DNS admin",
              "Automated off-site backups",
              "Uptime & security posture monitoring",
              /* TODO(owner): this line promises phone support, but the site has no phone number. Confirm the line or add a number. No number was invented here. */
              "Direct priority email & phone support"
            ],
            note: "Eliminate technical overhead—focus on running your business while we keep your web presence fast and secure."
          }
        ]
      },
      {
        id: "pc",
        label: "Custom PC Workstations",
        /* TODO(owner): confirm this steering note and that Office & Productivity is the right “start here” tier. */
        notSure: "Not sure? Start here: Office & Productivity Workstation for everyday work. The Gaming and Creator tiers cost more because the parts are faster. Choose them only if you actually need that performance.",
        tiers: [
          {
            id: "pc-office",
            startHere: true,
            name: "Office & Productivity Workstation",
            shortDesc: "Whisper-quiet, ultra-responsive desktop built for multi-monitor business workflows.",
            fit: "Whisper-quiet, ultra-responsive desktop built for multi-monitor business workflows.",
            price: "$950+",
            turnaround: "Est. 5–7 Days",
            formValue: "Custom PC Build — Office & Productivity Workstation",
            budgetHint: "$950–$1,400 (Parts + Assembly) • 1 week turnaround",
            deliverables: [
              "Multi-core modern CPU & 32GB DDR5 RAM",
              "High-speed 1TB+ Gen4 NVMe SSD",
              "Compact, whisper-quiet chassis",
              "Clean Windows 11 Pro (zero bloatware)",
              "Multi-display output readiness",
              "24-hour thermal & memory validation"
            ],
            note: "Includes itemized retail component receipts so you keep full manufacturer warranties on every part."
          },
          {
            id: "pc-gaming",
            name: "Enthusiast Gaming Rig",
            shortDesc: "High-FPS 1440p/4K gaming PC with optimized airflow and clean cable craft.",
            fit: "High-FPS 1440p/4K gaming PC with optimized airflow and clean cable craft.",
            price: "$1,650+",
            turnaround: "Est. 5–10 Days",
            formValue: "Custom PC Build — Enthusiast Gaming Rig",
            budgetHint: "$1,650–$2,800 (Parts + Assembly) • 5–10 days",
            deliverables: [
              "Custom GPU & CPU pairing for target FPS",
              "High-airflow mesh case & acoustic tuning",
              "EXPO/XMP memory & Resizable BAR tuned",
              "Custom fan curves & GPU undervolt option",
              "Clean OS & latest chipset/GPU drivers",
              "3DMark & OCCT stability burn-in report"
            ],
            note: "Zero proprietary pre-built shortcuts—every motherboard, PSU, and cooler is standard and easily upgradeable."
          },
          {
            id: "pc-creator",
            name: "Creator / CAD Workstation",
            shortDesc: "Heavy-duty workstation engineered for 4K video editing, 3D CAD, and local AI.",
            fit: "Heavy-duty workstation engineered for 4K video editing, 3D CAD, and local AI.",
            price: "$2,400+",
            turnaround: "Est. 7–10 Days",
            formValue: "Custom PC Build — Creator / CAD Workstation",
            budgetHint: "$2,400–$4,500+ (Parts + Assembly) • 7–10 days",
            deliverables: [
              "High-core-count workstation processor",
              "64GB–128GB high-bandwidth RAM",
              "Dual NVMe scratch + project storage",
              "High-VRAM GPU for CUDA/CAD workloads",
              "Platinum-rated power supply & cooling",
              "Sustained full-load thermal certification"
            ],
            note: "Tailored specifically to Adobe Creative Cloud, SolidWorks, AutoCAD, DaVinci Resolve, or local LLM workloads."
          }
        ]
      },
      {
        id: "upgrade",
        label: "Hardware Upgrade & Tune-Up",
        /* TODO(owner): confirm this steering note. The second sentence is existing copy from the Integrity principle. */
        notSure: "Not sure? Start here: System Diagnostics & Thermal Tune-Up before you buy parts or a new computer. If an upgrade solves your bottleneck better than a new build, we tell you upfront.",
        tiers: [
          {
            id: "hw-diag",
            startHere: true,
            name: "System Diagnostics & Thermal Tune-Up",
            shortDesc: "Resolve random crashes, overheating, thermal throttling, or boot failures.",
            fit: "Resolve random crashes, overheating, thermal throttling, or boot failures.",
            price: "$95 Flat",
            turnaround: "Est. 24–48 Hours",
            /* Distinct from the NVMe upgrade. The old form used one shared value for both. */
            formValue: "Hardware Diagnostics — System Diagnostics & Thermal Tune-Up",
            budgetHint: "$95 diagnostic & tune-up • 24–48 hour turnaround",
            deliverables: [
              "Component-level stability & memory test",
              "CPU/GPU thermal repasting & fan service",
              "BIOS update & driver conflict resolution",
              "Startup bloatware & background cleanup",
              "Storage health & backup readiness check",
              "Written findings & upgrade roadmap"
            ],
            note: "If you proceed with a recommended hardware repair or upgrade, your diagnostic fee applies toward the labor."
          },
          {
            id: "hw-upgrade",
            name: "NVMe SSD, RAM & Performance Upgrade",
            shortDesc: "Dramatically accelerate boot times and multitasking without buying a new PC.",
            fit: "Dramatically accelerate boot times and multitasking without buying a new PC.",
            price: "$125 + Parts",
            turnaround: "Est. 1–3 Days",
            formValue: "Hardware Upgrade — NVMe SSD, RAM & Performance Upgrade",
            budgetHint: "$125 labor + vetted upgrade parts • 1–3 days",
            deliverables: [
              "Bit-accurate OS & data cloning to NVMe",
              "RAM capacity & speed expansion",
              "GPU & power supply compatibility check",
              "Internal dust cleaning & airflow check",
              "Fresh high-conductivity thermal paste",
              "Full hardware stress & SMART verification"
            ],
            note: "We verify exact motherboard and power supply compatibility before ordering any component."
          }
        ]
      }
    ]
  },

  about: {
    eyebrow: "Why Legacy Computing",
    title: "Enterprise systems discipline with local craftsmanship.",
    lede: "Founded by Scott James Kramer in Harford County, Legacy Computing Services LLC bridges the gap between impersonal big-box repair counters and overpriced enterprise agencies.",
    body: "Every website deployed and every workstation assembled is treated as critical infrastructure—documented, hardened, stress-tested, and built to serve you reliably for years.",
    processEyebrow: "4-Step Engagement Workflow"
  },

  principles: [
    {
      n: "01",
      tone: "amber",
      title: "Integrity & Transparency",
      body: "Honest part pricing with zero hidden markups and zero unnecessary upsells. If an upgrade solves your bottleneck better than a new build, we tell you upfront."
    },
    {
      n: "02",
      tone: "sky",
      title: "Security-First Mindset",
      body: "Clean OS installations free from vendor bloatware, hardened DNS/SSL web configurations, and sensible backup & credential hygiene baked into every project."
    },
    {
      n: "03",
      tone: "sky",
      title: "Built for Longevity",
      body: "Standardized, serviceable, and upgradeable hardware architectures paired with clean, maintainable web code—so your investment scales cleanly over time."
    },
    {
      n: "04",
      tone: "amber",
      title: "Direct Local Accountability",
      body: "Work directly with the engineer and builder in Bel Air, Maryland—never an outsourced call center or rotating ticket queue."
    }
  ],

  process: [
    { n: "01", title: "Discovery & Honest Assessment", detail: "We define clear goals, workload requirements, and exact budget parameters.", tone: "sky" },
    { n: "02", title: "Transparent Architecture & BOM", detail: "Review a clear sitemap or itemized component bill-of-materials before work begins.", tone: "sky" },
    { n: "03", title: "Precision Build & Stress-Testing", detail: "Clean code, responsive QA, thermal burn-in testing, and hardened OS configuration.", tone: "sky" },
    { n: "04", title: "Direct Handoff & Local Support", detail: "Complete documentation, full ownership transfer, and ongoing Harford County support.", tone: "amber" }
  ],

  serviceArea: {
    eyebrow: "Local Harford County & Regional Coverage",
    /* TODO(owner): this heading omits Fallston; the chip list and footer line include it. Left as previously written. Confirm which list is right. */
    title: "Proudly serving Bel Air, Forest Hill, Aberdeen, Abingdon & Harford County, MD",
    body: "Local pickup, drop-off, and on-site consultations available throughout Harford & Baltimore Counties—plus remote web engineering nationwide.",
    footerLine: "Bel Air, Forest Hill, Aberdeen, Abingdon, Fallston & Greater Harford County, Maryland.",
    towns: ["Bel Air", "Forest Hill", "Aberdeen", "Abingdon", "Fallston"]
  },

  contact: {
    eyebrow: "Start a Conversation",
    title: "Request a Consultation or Custom Quote",
    lede: "Tell us about your website goals, workstation workload, or hardware issue. We respond within one business day with clear, practical next steps.",
    inboxLabel: "Direct Engineering Inbox",
    domainLine: "Domain: legacycomputingservices.com • Bel Air, MD",
    formNote: "Submitting opens your email app with this consultation filled in, and the service category in the subject. Nothing is sent until you press Send there.",
    error: "Please complete all required fields (Name, valid Email, Service, and Project Details) before submitting.",
    submitLabel: "Open in My Email App",
    successTitle: "Your email app is opening",
    successBody: "A message to info@legacycomputingservices.com is ready, with your service category in the subject. Press Send in your email app to deliver it. Nothing has been sent yet.",
    againLabel: "Open the email again",
    editLabel: "Edit this request"
  },

  /* Option values are what go in the mailto subject. Diagnostics and the NVMe upgrade are separate. */
  contactServices: [
    { value: "Web Design — Starter Site", label: "Web Design — Starter Site" },
    { value: "Web Design — Full Business Redesign", label: "Web Design — Full Business Redesign" },
    { value: "Web Design — Managed Hosting & Google Workspace", label: "Web Design — Managed Hosting & Workspace" },
    { value: "Custom PC Build — Office & Productivity Workstation", label: "Custom PC — Office / Productivity" },
    { value: "Custom PC Build — Enthusiast Gaming Rig", label: "Custom PC — Enthusiast Gaming" },
    { value: "Custom PC Build — Creator / CAD Workstation", label: "Custom PC — Creator / CAD Workstation" },
    { value: "Hardware Upgrade — NVMe SSD, RAM & Performance Upgrade", label: "Hardware Upgrade — NVMe, RAM & Performance" },
    { value: "Hardware Diagnostics — System Diagnostics & Thermal Tune-Up", label: "Hardware Diagnostics & Thermal Tune-Up" }
  ],

  quote: {
    text: "Whether it’s a local business’s first modern website or a custom workstation built from bare metal, our standard is simple: build it right, secure it properly, and stand behind every detail.",
    by: "— Scott James Kramer, Founder"
  },

  footer: {
    blurb: "Bespoke web engineering, custom PC workstations, and precision hardware upgrades serving Bel Air and Harford County, Maryland.",
    tagline: "Engineered in Harford County, Maryland"
  },

  nav: [
    { id: "home", label: "Home" },
    { id: "services", label: "Services" },
    { id: "estimator", label: "Estimator" },
    { id: "about", label: "About" },
    { id: "contact", label: "Contact" }
  ]
};
