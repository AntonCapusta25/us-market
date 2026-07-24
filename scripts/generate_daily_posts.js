import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// High-intent keywords and topics targeting the Netherlands
const TOPIC_QUEUE = [
  {
    topic: 'Klantenportaal op maat bouwen voor B2B en dienstverleners',
    keywordEn: 'custom client portal software development',
    keywordNl: 'klantenportaal op maat bouwen',
    concept: 'Why off-the-shelf client portals are frustrating, and how building a custom client portal streamlines operations and client communication.'
  },
  {
    topic: 'Bespoke CRM en ERP software laten bouwen',
    keywordEn: 'bespoke CRM ERP software development',
    keywordNl: 'CRM op maat laten bouwen',
    concept: 'Standard CRMs like HubSpot are bloated and expensive. Why scaling companies build bespoke CRMs tailored exactly to their proprietary operational workflows.'
  },
  {
    topic: 'Interne software en dashboard applicaties op maat',
    keywordEn: 'custom internal tools and dashboards development',
    keywordNl: 'interne software op maat laten maken',
    concept: 'Building proprietary operations dashboards, inventory trackers, and admin panels that eliminate spreadsheet chaos and integrate securely with existing data sources.'
  },
  {
    topic: 'Legacy software moderniseren en cloud migratie',
    keywordEn: 'modernizing legacy software systems databases',
    keywordNl: 'legacy software moderniseren',
    concept: 'Migrating legacy desktop software and outdated databases (Access, local Excel sheets) to secure, cloud-native SQL/PostgreSQL databases with modern APIs.'
  },
  {
    topic: 'Custom software versus No-Code software',
    keywordEn: 'custom software development vs no code platforms',
    keywordNl: 'maatwerk software versus no-code',
    concept: 'The architectural, performance, and scaling limits of no-code platforms (Bubble, Retool) and why serious scaling companies must invest in custom code assets.'
  },
  {
    topic: 'Automatische documenten en offertes genereren op maat',
    keywordEn: 'custom automated document generation system',
    keywordNl: 'automatische documentengenerator op maat',
    concept: 'Building scalable serverless document generators that render and deliver thousands of custom PDF quotes, contracts, or analytical reports instantly.'
  }
];

async function generate() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY environment variable is not set. Skipping daily post generation.');
    process.exit(0);
  }

  const enFilePath = path.join(projectRoot, 'src', 'data', 'blogPosts.js');
  const nlFilePath = path.join(projectRoot, 'src', 'data', 'blogPostsNl.js');

  const enContent = fs.readFileSync(enFilePath, 'utf8');

  // Parse existing slugs from blogPosts.js
  const slugRegex = /slug:\s*'([^']+)'/g;
  const existingSlugs = [];
  let match;
  while ((match = slugRegex.exec(enContent)) !== null) {
    existingSlugs.push(match[1]);
  }
  console.log('Existing slugs:', existingSlugs);

  // Find a topic from the queue that is not already covered
  const selectTopic = TOPIC_QUEUE.find(t => {
    // Generate a simple slug from the topic name
    const slug = t.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return !existingSlugs.includes(slug);
  }) || TOPIC_QUEUE[0];

  const slug = selectTopic.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  console.log(`\nSelected Topic: "${selectTopic.topic}" | Slug: "${slug}"`);

  // Build existing slugs catalog for internal linking reference
  const linksCatalog = existingSlugs.slice(0, 5).map(s => `/blog/${s}`).join(', ');

  const prompt = `
You are a software engineer and content writer for AutoFlow Studio (a custom software development and automation agency in the Netherlands).
Generate a blog post in BOTH English and Dutch for the topic: "${selectTopic.topic}".
Focus keyword (English): "${selectTopic.keywordEn}"
Focus keyword (Dutch): "${selectTopic.keywordNl}"
Concept: ${selectTopic.concept}

Requirements for the generated copy:
1. **Tone and Voice**:
   - Write in a natural, conversational, human-written style, like a smart 11th grader or first-year university student.
   - Do NOT use typical robotic AI words, transition words, or corporate marketing slop (avoid: "Furthermore", "Moreover", "In this comprehensive guide", "In conclusion", "It is important to note", "In today's fast-paced digital world").
   - Shift the tone dynamically: sometimes sound enthusiastic and marketing-minded like Neil Patel (simple, punchy, engaging, story-driven), and sometimes sound like a sharp, slightly cynical junior engineer who is tired of manual corporate BS.
   - Keep sentences and paragraphs short and varied in length. Use casual phrasing like "Look," "Honestly," "Here is the thing," "Let's be real."
2. **Length**: The text body (bodyEn and bodyNl) MUST be strictly greater than 8,500 characters. Go deep into real setups, examples, and technical details.
3. **Layout**: Format the body as HTML wrapped inside a '<div class="article-content">' element. Use proper headers (h2, h3), lists (ul, ol), and highlight blocks ('<div class="results-box">...</div>' or '<div class="highlight-box">...</div>'). Include a hero image block at the top: '<div class="hero-image"><img src="/images/blog_${slug}.png" alt="Descriptive Alt Text" /></div>'.
4. **Keyword Placement**: Place the main keyword in the H1 title, and naturally place related keywords inside H2 and H3 elements.
5. **Interlinking**: Integrate 2-3 links to existing blog posts. Use exactly these URLs in your links if relevant: ${linksCatalog}. Format: <a href="/blog/slug-name">Anchor Text</a> (for English) and <a href="/nl/blog/slug-name">Anchor Text</a> (for Dutch).
6. **Brand Placement**: Highlight "AutoFlow Studio" naturally in the body text twice, as the expert implementation agency for custom integrations.
7. **FAQs**: Provide 3 relevant FAQ Q&As for both languages.

Output your response ONLY in JSON format matching the schema:
{
  "slug": "${slug}",
  "titleEn": "English Title",
  "descEn": "English summary / meta description",
  "bodyEn": "HTML body content (must be >8500 chars)",
  "faqsEn": [
    { "q": "Question?", "a": "Answer." }
  ],
  "titleNl": "Dutch Title",
  "descNl": "Dutch summary / meta description",
  "bodyNl": "HTML body content (must be >8500 chars)",
  "faqsNl": [
    { "q": "Question?", "a": "Answer." }
  ]
}
`;

  console.log('Sending request to Gemini API...');
  const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            slug: { type: 'STRING' },
            titleEn: { type: 'STRING' },
            descEn: { type: 'STRING' },
            bodyEn: { type: 'STRING' },
            faqsEn: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  q: { type: 'STRING' },
                  a: { type: 'STRING' }
                },
                required: ['q', 'a']
              }
            },
            titleNl: { type: 'STRING' },
            descNl: { type: 'STRING' },
            bodyNl: { type: 'STRING' },
            faqsNl: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  q: { type: 'STRING' },
                  a: { type: 'STRING' }
                },
                required: ['q', 'a']
              }
            }
          },
          required: [
            'slug', 'titleEn', 'descEn', 'bodyEn', 'faqsEn',
            'titleNl', 'descNl', 'bodyNl', 'faqsNl'
          ]
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Gemini API request failed:', response.status, errorText);
    process.exit(1);
  }

  const result = await response.json();
  const rawText = result.candidates[0].content.parts[0].text;
  const blogData = JSON.parse(rawText);

  console.log('Generated post details:');
  console.log(`Slug: ${blogData.slug}`);
  console.log(`Title EN: ${blogData.titleEn}`);
  console.log(`Body EN length: ${blogData.bodyEn.length} chars`);
  console.log(`Title NL: ${blogData.titleNl}`);
  console.log(`Body NL length: ${blogData.bodyNl.length} chars`);

  // Format English post object for Javascript
  const formattedEnPost = `  {
    slug: '${blogData.slug}',
    title: \`${blogData.titleEn}\`,
    desc: \`${blogData.descEn}\`,
    date: 'July 2026',
    faqs: ${JSON.stringify(blogData.faqsEn, null, 6)},
    body: \`${blogData.bodyEn.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`,
  },
`;

  // Format Dutch post object for Javascript
  const formattedNlPost = `  {
    slug: '${blogData.slug}',
    title: \`${blogData.titleNl}\`,
    desc: \`${blogData.descNl}\`,
    date: 'Juli 2026',
    faqs: ${JSON.stringify(blogData.faqsNl, null, 6)},
    body: \`${blogData.bodyNl.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`,
  },
`;

  // Write back to blogPosts.js
  const exportPatternEn = 'export const getBlogBySlug';
  const exportIndexEn = enContent.lastIndexOf(exportPatternEn);
  if (exportIndexEn === -1) {
    console.error('❌ Could not locate export statement in blogPosts.js');
    process.exit(1);
  }
  const enIndex = enContent.lastIndexOf(']', exportIndexEn);
  if (enIndex === -1) {
    console.error('❌ Could not locate closing bracket in blogPosts.js');
    process.exit(1);
  }
  const updatedEnContent = enContent.slice(0, enIndex) + formattedEnPost + enContent.slice(enIndex);
  fs.writeFileSync(enFilePath, updatedEnContent, 'utf8');
  console.log('✅ Successfully appended English article to blogPosts.js');

  // Write back to blogPostsNl.js
  const nlContent = fs.readFileSync(nlFilePath, 'utf8');
  const exportPatternNl = 'export const getNlBlogBySlug';
  const exportIndexNl = nlContent.lastIndexOf(exportPatternNl);
  if (exportIndexNl === -1) {
    console.error('❌ Could not locate export statement in blogPostsNl.js');
    process.exit(1);
  }
  const nlIndex = nlContent.lastIndexOf(']', exportIndexNl);
  if (nlIndex === -1) {
    console.error('❌ Could not locate closing bracket in blogPostsNl.js');
    process.exit(1);
  }
  const updatedNlContent = nlContent.slice(0, nlIndex) + formattedNlPost + nlContent.slice(nlIndex);
  fs.writeFileSync(nlFilePath, updatedNlContent, 'utf8');
  console.log('✅ Successfully appended Dutch article to blogPostsNl.js');
}

generate().catch(err => {
  console.error('❌ Execution failed:', err);
  process.exit(1);
});
