async function runUpload(ukCsvText, usCsvText) {
  console.log('Starting upload script in browser context...');

  if (!window.supabase) {
    throw new Error('window.supabase client not found on the page.');
  }

  function parseCSV(text) {
    const lines = [];
    let row = [];
    let col = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i+1];
      if (inQuotes) {
        if (char === '"' && next === '"') { col += '"'; i++; }
        else if (char === '"') { inQuotes = false; }
        else { col += char; }
      } else {
        if (char === '"') { inQuotes = true; }
        else if (char === ',') { row.push(col); col = ''; }
        else if (char === '\r' || char === '\n') {
          row.push(col);
          if (row.some(c => c.trim())) lines.push(row);
          row = [];
          col = '';
          if (char === '\r' && next === '\n') i++;
        }
        else { col += char; }
      }
    }
    if (row.length || col) {
      row.push(col);
      if (row.some(c => c.trim())) lines.push(row);
    }
    return lines;
  }

  function mapRowToLead(row, headers, assigneeId) {
    const lead = {};
    headers.forEach((h, idx) => {
      const val = (row[idx] || '').trim();
      lead[h] = val;
    });

    const emailRaw = lead['email'] || '';
    const emails = emailRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const primaryEmail = emails[0] || '';

    if (!primaryEmail) return null;

    const query = lead['query'] || '';
    let industry = query;
    let location = '';
    const match = query.match(/^(.+?)\s+in\s+(.+)$/i);
    if (match) {
      industry = match[1].trim();
      location = match[2].trim();
    }

    return {
      email: primaryEmail,
      name: lead['name'] || '',
      company: lead['name'] || '',
      website: lead['website'] || '',
      phone: lead['phone'] || '',
      industry: industry,
      location: location,
      assignee_id: assigneeId,
      status: 'New',
      metadata: {
        google_maps_url: lead['google maps url'] || '',
        integrations: lead['integrations'] || '',
        original_query: query,
        all_emails: emails
      },
      notes: `Scraped lead from query: "${query}".` + 
             (lead['integrations'] ? ` Integrations: ${lead['integrations']}.` : '') +
             (emails.length > 1 ? ` Additional Emails: ${emails.slice(1).join(', ')}.` : '')
    };
  }

  // Parse UK leads (Mzi: abfe1ff3-edf1-4c1a-bbdf-07876ab71161)
  const ukRows = parseCSV(ukCsvText);
  const ukHeaders = ukRows[0].map(h => h.trim().toLowerCase());
  const ukLeads = [];
  for (let i = 1; i < ukRows.length; i++) {
    const lead = mapRowToLead(ukRows[i], ukHeaders, 'abfe1ff3-edf1-4c1a-bbdf-07876ab71161');
    if (lead) ukLeads.push(lead);
  }
  console.log(`Parsed ${ukLeads.length} valid UK leads.`);

  // Parse US leads (Justin: 32363265-7b61-4b4f-8a32-0bd93d0e4c17)
  const usRows = parseCSV(usCsvText);
  const usHeaders = usRows[0].map(h => h.trim().toLowerCase());
  const usLeads = [];
  for (let i = 1; i < usRows.length; i++) {
    const lead = mapRowToLead(usRows[i], usHeaders, '32363265-7b61-4b4f-8a32-0bd93d0e4c17');
    if (lead) usLeads.push(lead);
  }
  console.log(`Parsed ${usLeads.length} valid US leads.`);

  const allLeads = [...ukLeads, ...usLeads];
  console.log(`Total leads to process: ${allLeads.length}`);

  // Fetch existing emails to prevent duplicates
  console.log('Checking for duplicates in the database...');
  const emailsToCheck = [...new Set(allLeads.map(l => l.email))];
  const existingEmails = new Set();
  
  for (let i = 0; i < emailsToCheck.length; i += 1000) {
    const chunk = emailsToCheck.slice(i, i + 1000);
    const { data, error } = await window.supabase
      .from('outreach_leads')
      .select('email')
      .in('email', chunk);
    
    if (error) {
      console.error('Error fetching existing emails:', error);
      throw error;
    }
    if (data) {
      data.forEach(d => existingEmails.add(d.email.toLowerCase()));
    }
  }
  console.log(`Found ${existingEmails.size} existing emails in DB.`);

  const uniqueLeads = allLeads.filter(l => !existingEmails.has(l.email));
  const duplicateCount = allLeads.length - uniqueLeads.length;
  console.log(`Filtered out ${duplicateCount} duplicates. Unique leads to insert: ${uniqueLeads.length}`);

  // Batch insert unique leads
  let insertedCount = 0;
  for (let i = 0; i < uniqueLeads.length; i += 100) {
    const batch = uniqueLeads.slice(i, i + 100);
    const { error } = await window.supabase
      .from('outreach_leads')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch starting at index ${i}:`, error);
      throw error;
    }
    insertedCount += batch.length;
    console.log(`Successfully uploaded ${insertedCount}/${uniqueLeads.length} new leads...`);
  }

  console.log('Upload process completed successfully!');
  return {
    success: true,
    totalParsed: allLeads.length,
    skippedDuplicates: duplicateCount,
    insertedCount: insertedCount
  };
}
window.runUpload = runUpload;
console.log('window.runUpload initialized!');
