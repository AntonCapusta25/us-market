// Translations for all UI strings used across the site.
// Add new keys here when adding new translatable content.

export const translations = {
  en: {
    nav: {
      home: 'Home',
      blog: 'Blog',
      portfolio: 'Portfolio',
      contact: 'Contact',
    },
    hero: {
      headlinePrefix: 'Automate your ',
      headlineWords: ['CRM systems.', 'sales pipelines.', 'smart reporting.', 'client onboarding.', 'marketing funnels.', 'web applications.'],
      sub: 'Custom software and automation systems that drastically improve your ROI. From professional CRMs to full web applications — built for scale and delivered in under 7 days.',
      cta: 'Book Free Audit',
    },
    logosLabel: 'Our Partners & APIs',
    startupDreams: {
      superTitle: 'BUILT TO HELP YOU MOVE FAST',
      title: 'Do not stop ',
      titleHighlight: 'dreaming.',
      sub: 'We know how it feels when everything is slow and messy. We don\'t just "connect apps"—we build custom code that actually works and stays that way.',
      cards: [
        { img: 'fix-the-mess.jpg', title: 'Fix the Mess', desc: 'Stop using duct-tape and hope. We replace broken links with custom code that just works.' },
        { img: 'startup_plan.jpg', title: 'From 2 Weeks to 3 Days', desc: 'We cut onboarding by 80%. What used to take weeks of manual work now happens in days.' },
        { img: 'startup_automate.png', title: 'No More Broken Links', desc: 'Ditch the "fragile" tools. We build professional CRMs and systems that won\'t break when you scale.' },
        { img: 'weve-been-there.jpg', title: 'We\'ve Been There', desc: 'We know the pain of slow operations. We know exactly what to fix and how to do it without the high price tag.' },
        { img: 'more-growth.jpg', title: 'More Growth, Less Work', desc: 'Grow your business without hiring more people to do boring stuff. Our tools do the busywork for you.' },
        { img: 'built-for-long-run.jpg', title: 'Built for the Long Run', desc: "Focus on your big ideas. We'll make sure the background stuff is solid and ready to grow with you." },
      ],
      banner: {
        title: 'Keep dreaming and building what matters.',
        sub: 'Leave all the boring stuff to us.',
        img: 'startup_rocket_banner.png'
      }
    },
    caseStudies: {
      title: 'Real Results from Real Projects',
      sub: 'See how our automation solutions have transformed businesses with measurable results and proven ROI.',
    },
    timeline: {
      badge: 'OUR PROCESS',
      title: 'We handle everything',
      sub: '',
      steps: [
        { title: 'Discover', desc: 'We learn about your business and your goals.' },
        { title: 'Build', desc: 'We design and build automations tailored to you.' },
        { title: 'Deploy', desc: 'We test, refine and deploy to your systems.' },
        { title: 'Optimize', desc: 'We continuously monitor and improve your automations.' },
      ],
    },
    services: {
      badge: 'OUR EXPERTISE',
      title: 'What We ',
      titleHighlight: 'Build',
      sub: 'We build production-grade automation systems that turn manual bottlenecks into scalable growth engines.',
      items: [
        {
          title: 'Custom CRM Systems',
          desc: 'High-fidelity dashboards with persistent activity sidebars, real-time lead tracking, and seamless call-logging tools.',
          icon: 'crm'
        },
        {
          title: 'Smart Reporting',
          desc: 'Automated dashboards and real-time reports for your most critical business metrics.',
          icon: 'stats'
        },
        {
          title: 'Outreach Automation',
          desc: 'Hyper-personalized email and SMS sequences that sound human and land in the inbox, not the spam folder.',
          icon: 'outreach'
        },
        {
          title: 'AI Chatbots',
          desc: '24/7 intelligent support agents for Telegram, WhatsApp, or your website that handle queries and book meetings.',
          icon: 'bot'
        },
        {
          title: 'Website Integrations',
          desc: 'Connecting your platform to CRMs, payment gateways, and automated data pipelines for a seamless user journey.',
          icon: 'web'
        },
        {
          title: 'Custom Business Workflows',
          desc: 'Complex cross-platform integrations and AI logic that automate the specific, messy parts of your daily operations.',
          icon: 'custom'
        },
        {
          title: 'Performance Analytics',
          desc: 'Custom-built dashboards that track your automation ROI, business KPIs, and system performance in real-time.',
          icon: 'stats'
        }
      ]
    },
    testimonials: {
      badge: 'Testimonials',
      title: 'What Our Clients Say',
      sub: 'about Finder Admin',
    },
    booking: {
      title: 'Book Your',
      highlight: 'Automation Audit',
      sub: 'From custom workflows to AI automation, we build solutions tailored to your business needs.',
      feat1: 'Expert Automation Engineers',
      feat2: 'Custom Built Solutions',
    },
    blog: {
      badge: 'The Blog',
      title: 'Automation Insights',
      sub: 'Practical guides, case studies, and tips to help you automate smarter.',
      readMore: 'Read Article →',
      backToBlog: '← Back to Blog',
      prev: '← Previous',
      next: 'Next →',
      ctaTitle: 'Ready to automate your business?',
      ctaSub: "Book a free audit and we'll identify your top automation opportunities.",
      ctaBtn: 'Book Free Audit →',
    },
    contact: {
      badge: "Let's Talk",
      title: "Let's Automate Your Workflow",
      sub: 'Ready to eliminate manual work and save hours every week? Let\'s discuss your automation needs.',
      formTitle: 'Start Your Automation Journey',
      formSub: "Fill in the form and we'll get back to you within 24 hours.",
      bookTitle: '📅 Book a Free Call',
      bookSub: 'Schedule a free 30-minute automation audit call.',
      bookBtn: 'Book Free Audit →',
      locationTitle: '📍 Location',
      locationText: 'Based in the Netherlands<br />Working with clients worldwide<br />Available in multiple time zones',
      socialTitle: '✨ Follow Us',
      socialSub: 'Automation insights, case studies, and more:',
      faqTitle: 'Frequently Asked Questions',
      faqSub: 'Everything you need to know before we start.',
      faq: [
        { q: 'How long does a typical project take?', a: 'Most projects are delivered in 5–7 business days. Complex integrations may take 10–14 days. We always provide a clear timeline upfront.' },
        { q: 'Do I need technical knowledge?', a: 'Not at all — we handle everything technical and provide clear documentation and training.' },
        { q: 'What if I need changes later?', a: 'All projects include 30 days of free support. After that, we offer flexible maintenance plans or per-request updates.' },
        { q: 'Do you work with small businesses?', a: 'Absolutely — from solo founders to enterprise teams. Our solutions scale with your needs and budget.' },
      ],
      bookingTitle: 'Ready to <br /><span class="text-gradient">Scale Your Business?</span>',
      bookingSub: 'Custom automation built around your workflows, not generic templates.',
      getAudit: 'Get Free Audit',
    },
    portfolio: {
      badge: 'Our Work',
      title: 'Real Automation Projects',
      sub: 'Measurable results from real businesses. Every project is built custom for maximum ROI.',
      viewCase: 'View Case Study →',
      caseStudy: 'CASE STUDY',
    },
    common: {
      client: 'Client',
      industry: 'Industry',
      location: 'Location',
      coreStack: 'Core Stack',
      keyResults: 'Key Results',
      backToPortfolio: '← Back to Portfolio',
      questions: 'Have questions?',
      contactUs: 'Contact Our Team →',
      helpText: 'We\'re here to help you automate your business.',
      planConsultation: 'Schedule a Free Consultation',
      nextStep: 'Ready for the next step?',
      nextStepText: 'Every growing business has bottlenecks. Let\'s identify yours and build a custom solution that turns your biggest problem into your competitive advantage.',
    },
    form: {
      name: 'Name *',
      email: 'Email *',
      company: 'Company',
      message: 'What would you like to automate?',
      messagePlaceholder: 'Describe your current manual processes, pain points, or automation ideas…',
      send: 'Send Message',
      sending: 'Sending…',
      sent: '✓ Message sent! We\'ll be in touch within 24 hours.',
      error: 'Something went wrong. Please try again.',
      service: 'Service Needed',
      serviceOptions: [
        'Google Sheets Automation',
        'AI Workflow / Chatbot',
        'CRM / Lead Automation',
        'Custom Integration',
        'Other',
      ],
      size: 'Business Size',
      sizeOptions: ['Solo / Freelancer', '2–10 employees', '11–50 employees', '50+ employees'],
      platform: 'Current Tools (optional)',
      platformPlaceholder: 'e.g. HubSpot, Notion, Airtable…',
      book: 'Get Free Audit',
      booking: 'Sending…',
      booked: '✓ Request sent! We\'ll reach out shortly.',
    },
    footer: {
      rights: 'All rights reserved.',
      legal: 'Legal',
      privacy: 'Privacy',
      cookies: 'Cookies',
      contact: 'Contact',
      follow: 'Follow Us',
    },
    faq: {
      title: 'Frequently Asked Questions',
      sub: 'Everything you need to know about our automation services.',
      items: [
        { q: 'What kind of processes can you automate?', a: 'Almost any repetitive digital task. From smart reporting and data entry to complex AI-driven workflows and cross-platform integrations.' },
        { q: 'How long does a typical project take?', a: 'Simple automations can be ready in 3-5 days. Complex custom systems usually take 2-4 weeks.' },
        { q: 'Do I need to pay for software like Zapier or Make?', a: 'It depends on the solution. We often use custom code to bypass high subscription costs, but some projects benefit from specialized platforms.' },
        { q: 'Is my data secure?', a: 'Absolutely. We prioritize security and data privacy, building systems that comply with industry standards and your internal policies.' },
        { q: 'Can you integrate with my existing CRM?', a: 'Yes, we specialize in connecting siloed systems, including Salesforce, HubSpot, Pipedrive, and custom-built CRMs.' },
        { q: 'Do you offer ongoing support?', a: 'Yes, we provide flexible support plans to ensure your automations keep running smoothly as your business grows.' },
        { q: 'What is the typical ROI for automation?', a: 'Most clients see full ROI within 2-3 months by saving dozens of hours per week and reducing human error.' },
        { q: 'Do you work with non-technical teams?', a: 'Yes! We build user-friendly interfaces (like Google Sheets or Dashboards) so your team can control complex automations without writing a single line of code.' },
        { q: 'What makes Finder Admin different?', a: 'We don\'t just "connect apps." We build intelligent systems that use AI to think and act on your behalf, focusing on high-level business logic.' },
        { q: 'How do I get started?', a: 'Book a free 15-minute audit. We\'ll analyze your current workflows and show you exactly what can be automated.' }
      ]
    }
  },

  nl: {
    nav: {
      home: 'Home',
      blog: 'Blog',
      portfolio: 'Portfolio',
      contact: 'Contact',
    },
    hero: {
      headlinePrefix: 'Automatiseer je ',
      headlineWords: ['CRM systemen.', 'sales pijplijnen.', 'slimme rapportages.', 'klant onboarding.', 'marketing funnels.', 'webapplicaties.'],
      sub: 'Maatwerk software en automatiseringssystemen die je ROI drastisch verhogen. Van professionele CRM\'s tot volledige webapplicaties — gebouwd om te schalen en geleverd binnen 7 dagen.',
      cta: 'Boek Gratis Audit',
    },
    logosLabel: 'Onze Partners & API\'s',
    startupDreams: {
      superTitle: 'GEBOUWD OM JE TE LATEN KNALLEN',
      title: 'Stop niet met ',
      titleHighlight: 'dromen.',
      sub: 'We weten hoe het voelt als alles traag en rommelig is. We "koppelen niet alleen apps"—we bouwen maatwerk code die écht werkt en zo blijft.',
      cards: [
        { img: 'fix-the-mess.jpg', title: 'Ruim de Rommel Op', desc: 'Stop met houtje-touwtje oplossingen. Wij vervangen kapotte koppelingen door code die gewoon werkt.' },
        { img: 'startup_plan.jpg', title: 'Van 2 Weken naar 3 Dagen', desc: 'We verkortten de onboarding met 80%. Wat eerst weken handmatig werk was, gebeurt nu in een paar dagen.' },
        { img: 'startup_automate.png', title: 'Geen Kapotte Koppelingen Meer', desc: 'Weg met de kwetsbare tools. Wij bouwen professionele CRM\'s en systemen die niet breken als je groeit.' },
        { img: 'weve-been-there.jpg', title: 'We Kennen de Pijn', desc: 'We weten hoe frustrerend trage processen zijn. We weten precies wat we moeten fixen, zonder de hoofdprijs.' },
        { img: 'more-growth.jpg', title: 'Meer Groei, Minder Werk', desc: 'Schaal je bedrijf zonder extra mensen aan te nemen voor saai werk. Onze tools doen het werk voor je.' },
        { img: 'built-for-long-run.jpg', title: 'Klaar voor de Toekomst', desc: "Focus op je grote ideeën. Wij zorgen dat alles op de achtergrond staat als een huis en met je meegroeit." },
      ],
      banner: {
        title: 'Blijf dromen en bouwen aan wat echt telt.',
        sub: 'Laat al het saaie werk maar aan ons over.',
        img: 'startup_rocket_banner.png'
      }
    },
    caseStudies: {
      title: 'Echte Resultaten van Echte Projecten',
      sub: 'Bekijk hoe onze automatiseringsoplossingen bedrijven hebben getransformeerd met meetbare resultaten.',
    },
    timeline: {
      badge: 'ONS PROCES',
      title: 'Wij regelen alles',
      sub: '',
      steps: [
        { title: 'Ontdekken', desc: 'We leren over uw bedrijf en uw doelen.' },
        { title: 'Bouwen', desc: 'We ontwerpen en bouwen automatiseringen op maat.' },
        { title: 'Implementeren', desc: 'We testen, verfijnen en implementeren in uw systemen.' },
        { title: 'Optimaliseren', desc: 'We monitoren en verbeteren uw automatiseringen continu.' },
      ],
    },
    services: {
      badge: 'ONZE EXPERTISE',
      title: 'Wat Wij ',
      titleHighlight: 'Bouwen',
      sub: 'Wij bouwen professionele automatiseringssystemen die handmatige knelpunten veranderen in schaalbare groeimotoren.',
      items: [
        {
          title: 'Maatwerk CRM-Systemen',
          desc: 'Hoogwaardige dashboards met persistente zijbalken, realtime leadtracking en naadloze call-logging tools.',
          icon: 'crm'
        },
        {
          title: 'Slimme Rapportages',
          desc: 'Geautomatiseerde dashboards en realtime rapporten voor uw belangrijkste bedrijfsstatistieken.',
          icon: 'stats'
        },
        {
          title: 'Outreach Automatisering',
          desc: 'Hyper-gepersonaliseerde e-mail- en SMS-reeksen die menselijk klinken en in de inbox belanden, niet in de spam.',
          icon: 'outreach'
        },
        {
          title: 'AI Chatbots',
          desc: '24/7 intelligente support agents voor Telegram, WhatsApp of uw website die vragen beantwoorden en afspraken inplannen.',
          icon: 'bot'
        },
        {
          title: 'Website Integraties',
          desc: 'Het koppelen van uw platform aan CRM\'s, betaalsystemen en geautomatiseerde datapijplijnen voor een naadloze klantreis.',
          icon: 'web'
        },
        {
          title: 'Maatwerk Workflows',
          desc: 'Complexe cross-platform integraties en AI-logica die de specifieke, rommelige delen van uw dagelijkse operatie automatiseren.',
          icon: 'custom'
        },
        {
          title: 'Prestatie Analyse',
          desc: 'Op maat gemaakte dashboards die uw automatiserings-ROI, zakelijke KPI\'s en systeemprestaties realtime volgen.',
          icon: 'stats'
        }
      ]
    },
    testimonials: {
      badge: 'Getuigenissen',
      title: 'Wat Onze Klanten Zeggen',
      sub: 'over Finder Admin',
    },
    booking: {
      title: 'Boek Je',
      highlight: 'Automatisering Audit',
      sub: 'Van maatwerk workflows tot AI automatisering: wij bouwen oplossingen op maat van jouw bedrijf.',
      feat1: 'Expert Automatiseringsengineers',
      feat2: 'Op Maat Gemaakte Oplossingen',
    },
    blog: {
      badge: 'De Blog',
      title: 'Automatisering Inzichten',
      sub: 'Praktische gidsen, casestudies en tips om slimmer te automatiseren.',
      readMore: 'Lees Artikel →',
      backToBlog: '← Terug naar Blog',
      prev: '← Vorige',
      next: 'Volgende →',
      ctaTitle: 'Klaar om je bedrijf te automatiseren?',
      ctaSub: 'Boek een gratis audit en we identificeren je beste automatiseringsmogelijkheden.',
      ctaBtn: 'Boek Gratis Audit →',
    },
    contact: {
      badge: 'Neem Contact Op',
      title: 'Laten We Je Workflow Automatiseren',
      sub: 'Klaar om handmatig werk te elimineren en wekelijks uren te besparen? Laten we je automatiseringsbehoeften bespreken.',
      formTitle: 'Begin Je Automatiseringsreis',
      formSub: 'Vul het formulier in en we nemen binnen 24 uur contact op.',
      bookTitle: '📅 Boek een Gratis Gesprek',
      bookSub: 'Plan een gratis 30-minuten automatisering audit gesprek.',
      bookBtn: 'Boek Gratis Audit →',
      locationTitle: '📍 Locatie',
      locationText: 'Gevestigd in Nederland<br />Werken met klanten wereldwijd<br />Beschikbaar in meerdere tijdzones',
      socialTitle: '✨ Volg Ons',
      socialSub: 'Automatiseringsnieuws, casestudies en meer:',
      faqTitle: 'Veelgestelde Vragen',
      faqSub: 'Alles wat je moet weten voordat we beginnen.',
      faq: [
        { q: 'Hoe lang duurt een typisch project?', a: 'De meeste projecten worden opgeleverd in 5–7 werkdagen. Complexe integraties kunnen 10–14 dagen duren.' },
        { q: 'Heb ik technische kennis nodig?', a: 'Helemaal niet — wij regelen alles technisch en bieden duidelijke documentatie en training.' },
        { q: 'Wat als ik later wijzigingen nodig heb?', a: 'Alle projecten bevatten 30 dagen gratis support. Daarna bieden we flexibele onderhoudsplannen.' },
        { q: 'Werken jullie met kleine bedrijven?', a: 'Absoluut — van solo founders tot enterprise teams. Onze oplossingen schalen mee met je behoeften.' },
      ],
      bookingTitle: 'Klaar om Je <br /><span class="text-gradient">Bedrijf te Schalen?</span>',
      bookingSub: 'Maatwerk automatisering gebouwd rond jouw workflows, geen generieke templates.',
      getAudit: 'Krijg Gratis Audit',
    },
    portfolio: {
      badge: 'Ons Werk',
      title: 'Echte Automatiseringsprojecten',
      sub: 'Meetbare resultaten van echte bedrijven. Elk project is op maat gebouwd voor maximale ROI.',
      viewCase: 'Bekijk Case Study →',
      caseStudy: 'CASE STUDY',
    },
    common: {
      client: 'Klant',
      industry: 'Industrie',
      location: 'Locatie',
      coreStack: 'Core Stack',
      keyResults: 'Belangrijkste Resultaten',
      backToPortfolio: '← Terug naar Portfolio',
      questions: 'Vragen?',
      contactUs: 'Contact Ons Team →',
      helpText: 'Wij helpen u graag bij het automatiseren van uw bedrijf.',
      planConsultation: 'Plan een Gratis Consultatie',
      nextStep: 'Klaar voor de volgende stap?',
      nextStepText: 'Elk groeiend bedrijf heeft knelpunten. Laten we die van jou identificeren en een maatwerk oplossing bouwen die je grootste probleem verandert in een concurrentievoordeel.',
    },
    form: {
      name: 'Naam *',
      email: 'E-mail *',
      company: 'Bedrijf',
      message: 'Wat wil je automatiseren?',
      messagePlaceholder: 'Beschrijf je huidige handmatige processen, pijnpunten of automatiseringsideeën…',
      send: 'Stuur Bericht',
      sending: 'Verzenden…',
      sent: '✓ Bericht verzonden! We nemen binnen 24 uur contact op.',
      error: 'Er is iets misgegaan. Probeer het opnieuw.',
      service: 'Gewenste Dienst',
      serviceOptions: [
        'Google Sheets Automatisering',
        'AI Workflow / Chatbot',
        'CRM / Lead Automatisering',
        'Maatwerk Integratie',
        'Anders',
      ],
      size: 'Bedrijfsgrootte',
      sizeOptions: ['Solo / Freelancer', '2–10 medewerkers', '11–50 medewerkers', '50+ medewerkers'],
      platform: 'Huidige Tools (optioneel)',
      platformPlaceholder: 'bijv. HubSpot, Notion, Airtable…',
      book: 'Gratis Audit Aanvragen',
      booking: 'Verzenden…',
      booked: '✓ Aanvraag verzonden! We nemen snel contact op.',
    },
    footer: {
      rights: 'Alle rechten voorbehouden.',
      legal: 'Juridisch',
      privacy: 'Privacy',
      cookies: 'Cookies',
      contact: 'Contact',
      follow: 'Volg Ons',
    },
    faq: {
      title: 'Veelgestelde Vragen',
      sub: 'Alles wat je moet weten over onze automatiseringsdiensten.',
      items: [
        { q: 'Welke processen kunnen jullie automatiseren?', a: 'Bijna elk herhalend digitaal proces. Van slimme rapportages en data-invoer tot complexe AI-gestuurde workflows en platformonafhankelijke integraties.' },
        { q: 'Hoe lang duurt een gemiddeld project?', a: 'Eenvoudige automatiseringen kunnen binnen 3-5 dagen klaar zijn. Complexe maatwerksystemen duren meestal 2-4 weken.' },
        { q: 'Moet ik betalen voor software zoals Zapier of Make?', a: 'Dat hangt af van de oplossing. We gebruiken vaak eigen code om hoge abonnementskosten te vermijden, maar sommige projecten profiteren van gespecialiseerde platforms.' },
        { q: 'Is mijn data veilig?', a: 'Absoluut. We geven prioriteit aan beveiliging en gegevensprivacy en bouwen systemen die voldoen aan de industriestandaarden en jouw interne beleid.' },
        { q: 'Kunnen jullie integreren met mijn bestaande CRM?', a: 'Ja, we zijn gespecialiseerd in het koppelen van systemen, waaronder Salesforce, HubSpot, Pipedrive en op maat gemaakte CRM\'s.' },
        { q: 'Bieden jullie doorlopende ondersteuning?', a: 'Ja, we bieden flexibele ondersteuningsplannen om ervoor te zorgen dat je automatiseringen soepel blijven lopen terwijl je bedrijf groeit.' },
        { q: 'Wat is de typische ROI voor automatisering?', a: 'De meeste klanten zien een volledige ROI binnen 2-3 maanden door tientallen uren per week te besparen en menselijke fouten te verminderen.' },
        { q: 'Werken jullie ook met niet-technische teams?', a: 'Ja! We bouwen gebruiksvriendelijke interfaces (zoals Google Sheets of Dashboards) zodat je team complexe automatiseringen kan beheren zonder een regel code te schrijven.' },
        { q: 'Wat maakt Finder Admin anders?', a: 'We "verbinden niet alleen apps." We bouwen intelligente systemen die AI gebruiken om namens jou te denken en te handelen, met een focus op high-level bedrijfslogica.' },
        { q: 'Hoe begin ik?', a: 'Boek een gratis audit van 15 minuten. We analyseren je huidige workflows en laten je precies zien wat er geautomatiseerd kan worden.' }
      ]
    }
  },
}

export const getT = (lang) => translations[lang] || translations.en
