export function formatGuidanceReport(title: string, summaryJsonStr: string, createdAtStr: string): string {
  let parsedSummary: any = null;
  try {
    parsedSummary = JSON.parse(summaryJsonStr);
  } catch (e) {
    // If not JSON, return standard raw text report
    return `# NAYAK CASE SUMMARY AND ANALYSIS: ${title}\n` +
      `Status: Finalized\n` +
      `Date Compiled: ${new Date(createdAtStr).toLocaleString()}\n\n` +
      `--------------------------------------------------------------------------------\n` +
      `DISCLAIMER: This case summary is compiled as a helpful case organizing summary.\n` +
      `It does NOT represent legal advice, a court judgment, a verdict, or a lawyer's opinion.\n` +
      `--------------------------------------------------------------------------------\n\n` +
      `## 1. Summary\n` +
      `${summaryJsonStr}\n`;
  }

  const dateStr = new Date(createdAtStr).toLocaleString();
  let content = "";

  // Title & Header
  content += `# NAYAK CASE GUIDANCE REPORT: ${parsedSummary.title || title}\n`;
  content += `Status: Finalized\n`;
  content += `Date Compiled: ${dateStr}\n\n`;

  content += `--------------------------------------------------------------------------------\n`;
  content += `About this Guidance Report:\n`;
  content += `${parsedSummary.disclaimer || "This is a preliminary, fact-based legal information output and not a final legal opinion. A lawyer or authorised legal aid professional should verify the facts, documents, procedure, limitation, and applicable law."}\n`;
  content += `--------------------------------------------------------------------------------\n\n`;

  // Safety Warning if applicable
  if (parsedSummary.safety_flag) {
    content += `🚨 IMMEDIATE SAFETY WARNING:\n`;
    content += `If your situation involves ongoing violence, physical threats, child abuse, self-harm, or immediate danger, please do not rely on this tool. Go to a safe place immediately and call:\n`;
    content += `* Police Helpline: 112 / 100\n`;
    content += `* Women's Helpline: 1091 / 181\n`;
    content += `* Child Protection Helpline: 1098\n`;
    content += `* Cyber Crime Helpline: 1930\n\n`;
    content += `--------------------------------------------------------------------------------\n\n`;
  }

  // 1. What Happened (Summary)
  content += `### 1. What Happened (Summary)\n`;
  content += `${parsedSummary.summary || "No summary provided."}\n\n`;

  // 2. Key Facts We Understood
  content += `### 2. Key Facts We Understood\n`;
  if (parsedSummary.facts && parsedSummary.facts.length > 0) {
    parsedSummary.facts.forEach((fact: string) => {
      content += `* ${fact}\n`;
    });
  } else {
    content += `No facts provided.\n`;
  }
  content += `\n`;

  // 3. What Helps Your Case (Strengths)
  content += `### 3. What Helps Your Case (Strengths)\n`;
  if (parsedSummary.strengths && parsedSummary.strengths.length > 0) {
    parsedSummary.strengths.forEach((str: string) => {
      content += `* ${str}\n`;
    });
  } else {
    content += `No specific strengths identified.\n`;
  }
  content += `\n`;

  // 4. What May Make Your Case Harder to Prove (Weaknesses/Gaps)
  content += `### 4. What May Make Your Case Harder to Prove (Weaknesses/Gaps)\n`;
  if (parsedSummary.weaknesses_or_gaps && parsedSummary.weaknesses_or_gaps.length > 0) {
    parsedSummary.weaknesses_or_gaps.forEach((weak: string) => {
      content += `* ${weak}\n`;
    });
  } else {
    content += `No specific weaknesses or gaps identified.\n`;
  }
  content += `\n`;

  // 5. Timeline of Events
  content += `### 5. Timeline of Events\n`;
  if (parsedSummary.timeline && parsedSummary.timeline.length > 0) {
    parsedSummary.timeline.forEach((t: any) => {
      content += `* **Date**: ${t.date || "Unknown"}\n`;
      content += `  **Event**: ${t.event || "N/A"}\n`;
      content += `  **Certainty**: ${t.certainty || "N/A"}\n`;
    });
  } else {
    content += `No timeline events recorded.\n`;
  }
  content += `\n`;

  // 6. People Involved
  content += `### 6. People Involved\n`;
  if (parsedSummary.people_involved && parsedSummary.people_involved.length > 0) {
    parsedSummary.people_involved.forEach((p: any) => {
      content += `* **Name**: ${p.name || "N/A"}\n`;
      content += `  **Role**: ${p.role || "N/A"}\n`;
      content += `  **Status**: ${p.status || "N/A"}\n`;
    });
  } else {
    content += `No details on people involved.\n`;
  }
  content += `\n`;

  // 7. Relief Sought (What You Want)
  content += `### 7. Relief Sought (What You Want)\n`;
  if (parsedSummary.relief_sought && parsedSummary.relief_sought.length > 0) {
    parsedSummary.relief_sought.forEach((rel: string) => {
      content += `* ${rel}\n`;
    });
  } else {
    content += `No specific relief specified.\n`;
  }
  content += `\n`;

  // 8. Documents or Evidence
  content += `### 8. Documents or Evidence\n`;
  if (parsedSummary.documents_available && parsedSummary.documents_available.length > 0) {
    parsedSummary.documents_available.forEach((d: any) => {
      content += `* **Document**: ${d.document || "N/A"}\n`;
      content += `  **Status**: ${d.status || "N/A"}\n`;
      content += `  **Relevance**: ${d.relevance || "N/A"}\n`;
    });
  } else {
    content += `No documents listed.\n`;
  }
  content += `\n`;

  // 9. Immediate Risks
  content += `### 9. Immediate Risks\n`;
  if (parsedSummary.immediate_risks && parsedSummary.immediate_risks.length > 0) {
    parsedSummary.immediate_risks.forEach((r: any) => {
      content += `* **Risk**: ${r.risk || "N/A"}\n`;
      content += `  **Level**: ${r.level || "N/A"}\n`;
      content += `  **Reason**: ${r.reason || "N/A"}\n`;
    });
  } else {
    content += `No immediate risks identified.\n`;
  }
  content += `\n`;

  // 10. Preliminary Legal Issues
  content += `### 10. Preliminary Legal Issues\n`;
  if (parsedSummary.legal_issues_preliminary && parsedSummary.legal_issues_preliminary.length > 0) {
    parsedSummary.legal_issues_preliminary.forEach((i: any) => {
      content += `* **Issue**: ${i.issue || "N/A"}\n`;
      content += `  **Confidence**: ${i.confidence || "N/A"}\n`;
      content += `  **Reasoning**: ${i.reason || "N/A"}\n`;
    });
  } else {
    content += `No preliminary legal issues identified.\n`;
  }
  content += `\n`;

  // 11. Recommended Next Steps
  content += `### 11. Recommended Next Steps\n`;
  if (parsedSummary.recommended_next_steps && parsedSummary.recommended_next_steps.length > 0) {
    parsedSummary.recommended_next_steps.forEach((step: string, idx: number) => {
      content += `${idx + 1}. ${step}\n`;
    });
  } else {
    content += `No specific next steps recommended.\n`;
  }
  content += `\n`;

  // 12. Follow-Up Questions (for Intake Verification)
  if (parsedSummary.follow_up_questions && parsedSummary.follow_up_questions.length > 0) {
    content += `### 12. Follow-Up Questions (For Intake Verification)\n`;
    parsedSummary.follow_up_questions.forEach((q: string) => {
      content += `* ${q}\n`;
    });
    content += `\n`;
  }

  // 13. Safety Help Resources (only when safety_flag is true)
  if (parsedSummary.safety_flag) {
    content += `### 13. Safety Help Resources\n`;
    content += `Please contact the following helplines immediately for assistance:\n`;
    content += `* **National Emergency Response Support System (ERSS)**: Call **112** (All India emergency number for Police, Fire, Health)\n`;
    content += `* **Women Helpline**: Call **1091** or **181** (For domestic violence or safety threats)\n`;
    content += `* **Cyber Crime Helpline**: Call **1930** or visit **cybercrime.gov.in** (For online fraud, threats, or cyber abuse)\n`;
    content += `* **Child Helpline**: Call **1098** (For child safety concerns)\n\n`;
  }

  return content;
}

export function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
