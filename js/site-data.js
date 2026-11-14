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
    email: "scott@legacycomputingservices.com",
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
      summary: "Mobile-first websites for small businesses in Bel Air, Forest Hill, Fallston, Abingdon, and the rest of Harford County. The page works on a phone, is set up so local customers can find you on Google, and you keep the domain, the code, and the accounts.",
      tone: "sky",
      icon: "globe",
      inspectLabel: "Inspect Deliverables",
      estimateLabel: "Estimate →",
      /* TODO(owner): the old page jumped this card to the $1,450 redesign. It now opens the Starter Site (the “start here” tier). Confirm that default. */
      estimatorPreset: "web-starter",
      bullets: [
        "Mobile-first pages for customers in Harford County",
        "Local Google visibility, domain, SSL, and Google Workspace email",
        "You own the site and the code — no agency lock-in"
      ],
      modal: {
        eyebrow: "Pillar 01 // Web Engineering",
        title: "Web Design & Digital Modernization",
        summary: "Built for small businesses and nonprofits in Harford County that need a clear next step on a phone, local search visibility, and full ownership of the domain, the code, and the accounts.",
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
      summary: "Custom PCs for home users and enthusiasts in Harford County — everyday speed, a quiet gaming rig, or a heavier creator machine. The bench fee is on the estimator before any parts are ordered, and diagnostics do not start with an upsell.",
      tone: "amber",
      icon: "cpu",
      inspectLabel: "Inspect Build Protocol",
      estimateLabel: "Configure →",
      /* TODO(owner): the old page jumped this card to the $2,400 Creator / CAD tier. It now opens the Office & Productivity workstation. Confirm that default. */
      estimatorPreset: "pc-office",
      bullets: [
        "Retail parts with manufacturer warranties, and a written parts-plus-assembly range",
        "Burn-in before handoff so the speed is real at home",
        "Clean OS install, no trialware, and your files are not casually wiped"
      ],
      modal: {
        eyebrow: "Pillar 02 // Bespoke Systems",
        title: "Custom PC Building & Workstations",
        summary: "Built around the games, apps, and noise level you actually use at home, with retail parts and a bill of materials you can read before the build starts.",
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
      summary: "For a slow or crashing home PC in Bel Air, Forest Hill, Fallston, Abingdon, or nearby Harford County: a $95 diagnostic first. If you proceed with the repair, that fee is credited toward the repair. The speed upgrade is $125 labor plus parts, not a new computer by default.",
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
        summary: "Before a home PC is replaced, the $95 diagnostic finds the real bottleneck. If you proceed with the repair, that fee is credited toward the repair.",
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
    /* TODO(owner): confirm whether “consultation is free” includes on-site visits. The site already says on-site consultations are available in Harford & Baltimore Counties; it does not say those visits are free. */
    honestNote: "Consultation is free. Each tier shows a starting point and a range, what is included, and who it is for. We confirm the quote with you before any work begins. No surprise fees. The $95 diagnostic fee is credited toward the repair if you proceed.",
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
            fit: "A first site for a small business in Bel Air, Forest Hill, Fallston, Abingdon, or nearby Harford County that needs to be usable on a phone and findable locally.",
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
            fit: "An established Harford County business that already has more to publish than one page, and wants to own the finished site.",
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
            fit: "Ongoing care for a small-business site you already own in Harford County — not a substitute for building one, and not an agency lock-in.",
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
            fit: "A quiet home or home-office PC for everyday speed, browsing, and a second monitor.",
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
            fit: "For home enthusiasts who want higher frame rates, with the parts-plus-assembly range written down first.",
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
            fit: "For home creators editing video, running CAD, or using local AI — only if you actually need that speed.",
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
            fit: "A home PC in Harford County that crashes, overheats, or will not boot. The $95 fee is credited toward the repair if you proceed.",
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
            note: "The $95 diagnostic fee is credited toward the repair if you proceed."
          },
          {
            id: "hw-upgrade",
            name: "NVMe SSD, RAM & Performance Upgrade",
            shortDesc: "Dramatically accelerate boot times and multitasking without buying a new PC.",
            fit: "A home PC that is simply slow. This is the speed upgrade after diagnostics, not the default replacement.",
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
    successBody: "A message to scott@legacycomputingservices.com is ready, with your service category in the subject. Press Send in your email app to deliver it. Nothing has been sent yet.",
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

  /* Empty on purpose. The page renders no quotes until real ones are added. */
  testimonials: [],

  /* TODO(owner): when the Google Business Profile exists, set url to the reviews link. Until then the badge says coming soon and is not a link. */
  googleBusiness: {
    url: "",
    label: "Google Business Profile — coming soon"
  },

  portfolio: {
    eyebrow: "Our Work",
    title: "Sites and systems built for people here.",
    lede: "Real projects only. If a photo, link, or result is not in hand yet, the card says coming soon.",
    projects: [
      {
        id: "chusbc",
        kind: "web",
        title: "Cecil Harford USBC",
        place: "Cecil & Harford Counties, Maryland",
        summary: "A redesign of the Cecil Harford USBC association site. The live preview is the new layout. The before image is the public chusbc.org homepage as captured in November 2026.",
        liveUrl: "https://sjkram85.github.io/CHUSBC-Website-Redesign/",
        liveLabel: "Open the live preview",
        before: {
          src: "assets/portfolio/chusbc-before.jpg",
          alt: "chusbc.org homepage, November 2026",
          label: "Before"
        },
        after: {
          src: "assets/portfolio/chusbc-after.jpg",
          alt: "Cecil Harford USBC redesign preview",
          label: "After"
        }
      },
      {
        id: "forest-hill-lanes",
        kind: "web",
        title: "Forest Hill Lanes",
        place: "Forest Hill, Maryland",
        comingSoon: true,
        summary: "Coming soon.",
        /* TODO(owner): public URL and before/after screens for the Forest Hill Lanes redesign. A public bowling-center site exists, but it was not confirmed as this company’s work, so it is not linked here. */
        before: null,
        after: null
      }
    ],
    builds: [
      {
        id: "pc-showcase",
        title: "Custom PC build",
        place: "Harford County",
        comingSoon: true,
        summary: "Coming soon.",
        /* TODO(owner): a real build’s parts list, photos, and thermal readings. Do not publish sample numbers. */
        parts: [],
        photos: [],
        thermals: ""
      }
    ]
  },

  faq: {
    eyebrow: "How It Works",
    title: "Plain answers before you book.",
    lede: "Published prices are repeated here. Anything not yet decided is marked coming soon instead of guessed.",
    items: [
      {
        q: "What is the diagnostic fee for a home PC in Bel Air, Forest Hill, Fallston, Abingdon, or elsewhere in Harford County?",
        a: "The estimator lists a $95 flat diagnostic and tune-up. That is the bench fee for finding the fault before parts are sold. The $95 diagnostic fee is credited toward the repair if you proceed."
      },
      {
        q: "How do parts and payment work?",
        a: "Custom PC ranges on the estimator are parts plus assembly. The page already says you get itemized retail component receipts so manufacturer warranties stay with you. Upgrade labor is listed as $125 plus parts.",
        /* TODO(owner): when the customer pays, and whether parts are billed at retail with no markup or with a markup. No percent is stated. */
        soon: "Coming soon: payment timing and any parts markup."
      },
      {
        q: "Do you take a deposit before work starts?",
        a: "The quote is confirmed before any work begins. Deposit terms are not published yet.",
        /* TODO(owner): whether a deposit is required, the amount or percent, and when it is due. */
        soon: "Coming soon: deposit terms."
      },
      {
        q: "Is there a workmanship guarantee or a support window?",
        a: "The Full Business Redesign tier already lists 30 days of post-launch priority support. A general workmanship guarantee for home PC builds and repairs is not published yet.",
        /* TODO(owner): length and scope of any workmanship guarantee for builds and repairs, separate from the 30-day web support already listed on Full Business Redesign. */
        soon: "Coming soon: build and repair guarantee length."
      },
      {
        q: "What happens to my files and the details I send from Harford County?",
        a: "This website does not store the consultation. Submit opens your email app, and nothing is delivered until you press Send. PC upgrade work lists bit-accurate cloning onto a new drive. A written privacy policy is not published yet.",
        /* TODO(owner): how long customer files and drive images are kept, and where a privacy policy should live. */
        soon: "Coming soon: how long files are kept."
      }
    ]
  },

  founderProfile: {
    name: "Scott James Kramer",
    role: "Founder",
    /* TODO(owner): replace this empty photo with a headshot file path, for example assets/scott.jpg. */
    photo: "",
    photoSoon: "Headshot coming soon",
    /* TODO(owner): a short bio paragraph. The about text already on the page stays until this is written. */
    bio: "",
    bioSoon: "Bio coming soon"
  },

  nav: [
    { id: "home", label: "Home" },
    { id: "services", label: "Services" },
    { id: "work", label: "Our Work" },
    { id: "estimator", label: "Estimator" },
    { id: "about", label: "About" },
    { id: "contact", label: "Contact" }
  ]
};
