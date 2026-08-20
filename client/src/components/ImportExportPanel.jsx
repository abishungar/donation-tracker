import React, { useRef, useState } from "react";
import { Download, Upload, FileJson, FileSpreadsheet, Database, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import api from "../api";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function csvEscape(value) { const s = value == null ? "" : String(value); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function contactsToCsv(contacts = []) {
  const headers = ["firstName", "lastName", "phone", "email", "group", "active"];
  return [headers, ...contacts.map(c => [c.firstName,c.lastName,c.phone||"",c.email||"",c.group?.name||"",c.active!==false?"true":"false"])]
    .map(r => r.map(csvEscape).join(",")).join("\r\n");
}
function parseCsv(text) {
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++) { const ch=text[i];
    if(quoted){ if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;} else if(ch==='"') quoted=false; else cell+=ch; }
    else if(ch==='"') quoted=true; else if(ch===','){row.push(cell);cell="";} else if(ch==='\n'){row.push(cell.replace(/\r$/, ""));rows.push(row);row=[];cell="";} else cell+=ch;
  }
  row.push(cell.replace(/\r$/, "")); if(row.some(v=>v!=="")) rows.push(row); if(!rows.length)return [];
  const headers=rows[0].map(h=>String(h).trim());
  return rows.slice(1).filter(r=>r.some(v=>String(v||"").trim()!=="")).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}
function guess(headers, names) { const lower=headers.map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,"")); for(const n of names){const i=lower.indexOf(n.replace(/[^a-z0-9]/g,"")); if(i>=0)return headers[i];} return ""; }

const donationFields = [
  ["contact", "Contact / ID / name"], ["email", "Email"], ["firstName", "First name"], ["lastName", "Last name"],
  ["phone", "Phone"], ["group", "Group"], ["amount", "Amount *"], ["date", "Donation date"], ["type", "Donation type"]
];

export default function ImportExportPanel() {
  const contactInputRef=useRef(null), donationInputRef=useRef(null);
  const [busy,setBusy]=useState(false), [message,setMessage]=useState(""), [error,setError]=useState("");
  const [donationRows,setDonationRows]=useState([]), [headers,setHeaders]=useState([]), [mapping,setMapping]=useState({}), [fileName,setFileName]=useState("");
  const [preview,setPreview]=useState(false);


  function downloadContactTemplate(){
    const rows=[{firstName:"Jane",lastName:"Doe",email:"donor@example.com",phone:"555-123-4567",group:"Sample Group",active:true}];
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Contacts"); XLSX.writeFile(wb,"contact-import-template.xlsx"); setMessage("Sample contact sheet downloaded. Fill it in and upload it below.");
  }

  function downloadDonationTemplate(){
    const rows=[{contact:"",email:"donor@example.com",firstName:"Jane",lastName:"Doe",phone:"555-123-4567",group:"Sample Group",amount:100,date:new Date().toISOString().slice(0,10),type:"Online"}];
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Donations"); XLSX.writeFile(wb,"donation-import-template.xlsx"); setMessage("Sample donation sheet downloaded. Fill it in and upload it below.");
  }

  async function exportData(format){setBusy(true);setMessage("");setError("");try{const r=await api.get("/admin/export"),data=r.data||{},stamp=new Date().toISOString().slice(0,10);if(format==="json")downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),`donation-tracker-backup-${stamp}.json`);else downloadBlob(new Blob([contactsToCsv(data.contacts||[])],{type:"text/csv;charset=utf-8"}),`donation-tracker-contacts-${stamp}.csv`);setMessage(format==="json"?"Full backup exported.":"Contacts CSV exported.");}catch(e){setError(e.response?.data?.error||"Could not export data.");}finally{setBusy(false);}}

  async function importContacts(file){if(!file)return;setBusy(true);setMessage("");setError("");try{const text=await file.text();let rows;if(file.name.toLowerCase().endsWith(".json")){const parsed=JSON.parse(text);rows=Array.isArray(parsed)?parsed:(parsed.contacts||[]).map(c=>({firstName:c.firstName,lastName:c.lastName,phone:c.phone||"",email:c.email||"",group:c.group?.name||"",active:c.active!==false}));}else rows=parseCsv(text);if(!rows.length)throw new Error("No importable contact rows were found.");const r=await api.post("/admin/import",{rows});setMessage(`Contact import complete. ${r.data?.created??0} contact(s) added.`);if(contactInputRef.current)contactInputRef.current.value="";}catch(e){setError(e.response?.data?.error||e.message||"Could not import contacts.");}finally{setBusy(false);}}

  async function readDonationSheet(file){if(!file)return;setBusy(true);setMessage("");setError("");try{let rows=[];const name=file.name.toLowerCase();if(name.endsWith(".xlsx")||name.endsWith(".xls")){const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];rows=XLSX.utils.sheet_to_json(ws,{defval:"",raw:false});}else rows=parseCsv(await file.text());if(!rows.length)throw new Error("The sheet has no data rows.");const hs=Object.keys(rows[0]);setDonationRows(rows);setHeaders(hs);setMapping({contact:guess(hs,["contactid","contact","donorid","donor"]),email:guess(hs,["email","emailaddress"]),firstName:guess(hs,["firstname","first"]),lastName:guess(hs,["lastname","last"]),phone:guess(hs,["phone","phonenumber","mobile"]),group:guess(hs,["group","groupname"]),amount:guess(hs,["amount","donationamount","donation","total","gift"]),date:guess(hs,["date","donationdate","donatedate"]),type:guess(hs,["type","donationtype","paymenttype"]) });setFileName(file.name);setPreview(true);}catch(e){setError(e.message||"Could not read the sheet.");}finally{setBusy(false);}}

  async function importDonations(){setBusy(true);setMessage("");setError("");try{if(!mapping.amount)throw new Error("Map the Amount column before importing.");if(!mapping.contact&&!mapping.email&&!mapping.firstName)throw new Error("Map Contact, Email, or First name so donations can be matched to users.");const r=await api.post("/admin/import-donations",{rows:donationRows,mapping});const bad=r.data?.failed||[];setMessage(`Donation import complete. ${r.data?.created??0} donation(s) imported${bad.length?`; ${bad.length} row(s) need attention`:""}.`);if(bad.length)console.warn("Donation import failures",bad);setPreview(false);setDonationRows([]);if(donationInputRef.current)donationInputRef.current.value="";}catch(e){setError(e.response?.data?.error||e.message||"Could not import donations.");}finally{setBusy(false);}}

  return <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
    <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-gray-800">Import & Export</h2><p className="text-sm text-gray-500 mt-1">Back up your data, import contacts, or bring donations in from Excel/Google Sheets.</p></div><FileJson className="text-brand-600" size={22}/></div>
    <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <button disabled={busy} onClick={()=>exportData("json")} className="border rounded-xl px-4 py-3 text-left hover:border-brand-300 disabled:opacity-50"><Download size={17} className="inline mr-2 text-brand-600"/><span className="font-medium">Export Full Backup</span><span className="block text-xs text-gray-400 mt-1">JSON with contacts, groups, users and donations.</span></button>
      <button disabled={busy} onClick={()=>exportData("csv")} className="border rounded-xl px-4 py-3 text-left hover:border-brand-300 disabled:opacity-50"><FileSpreadsheet size={17} className="inline mr-2 text-brand-600"/><span className="font-medium">Export Contacts CSV</span><span className="block text-xs text-gray-400 mt-1">Easy to edit in Excel or Google Sheets.</span></button>
      <button disabled={busy} onClick={downloadContactTemplate} className="border rounded-xl px-4 py-3 text-left hover:border-brand-300 disabled:opacity-50"><FileSpreadsheet size={17} className="inline mr-2 text-brand-600"/><span className="font-medium">Download Contact Sample</span><span className="block text-xs text-gray-400 mt-1">Fill it in Excel/Sheets and upload it back.</span></button><button disabled={busy} onClick={()=>contactInputRef.current?.click()} className="border rounded-xl px-4 py-3 text-left hover:border-brand-300 disabled:opacity-50"><Upload size={17} className="inline mr-2 text-brand-600"/><span className="font-medium">Import Contacts</span><span className="block text-xs text-gray-400 mt-1">CSV or JSON contacts.</span></button>
      <input ref={contactInputRef} type="file" accept=".csv,.json,application/json,text/csv" className="hidden" onChange={e=>importContacts(e.target.files?.[0])}/>
    </div>

    <div className="mt-6 border-t pt-6"><div className="flex items-center gap-2"><Database size={19} className="text-brand-600"/><h3 className="font-semibold text-gray-800">Import Donations From Sheet</h3></div><p className="text-sm text-gray-500 mt-1">Upload an Excel file (.xlsx/.xls) or CSV exported from Google Sheets, then map your columns before importing.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={downloadDonationTemplate} className="border rounded-xl px-4 py-3 hover:border-brand-300 disabled:opacity-50"><FileSpreadsheet size={17} className="inline mr-2 text-brand-600"/>Download Sample Sheet</button><button disabled={busy} onClick={()=>donationInputRef.current?.click()} className="border rounded-xl px-4 py-3 hover:border-brand-300 disabled:opacity-50"><Upload size={17} className="inline mr-2 text-brand-600"/>{fileName||"Choose Donation Sheet"}</button></div>
      <input ref={donationInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={e=>readDonationSheet(e.target.files?.[0])}/>
    </div>

    {preview && <div className="mt-5 border rounded-2xl p-5 bg-gray-50"><div className="flex items-center justify-between gap-3"><div><h4 className="font-semibold text-gray-800">Map Sheet Columns</h4><p className="text-xs text-gray-500 mt-1">{donationRows.length} rows found. Required: Amount plus a way to identify the donor.</p></div><span className="text-xs bg-white border rounded-full px-3 py-1">{fileName}</span></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">{donationFields.map(([key,label])=><label key={key} className="text-sm"><span className="block text-gray-600 mb-1">{label}</span><select value={mapping[key]||""} onChange={e=>setMapping(m=>({...m,[key]:e.target.value}))} className="w-full border rounded-lg px-3 py-2 bg-white"><option value="">— Not mapped —</option>{headers.map(h=><option key={h} value={h}>{h}</option>)}</select></label>)}</div>
      <div className="mt-4 overflow-auto bg-white border rounded-xl"><table className="min-w-full text-xs"><thead><tr>{headers.slice(0,8).map(h=><th key={h} className="text-left px-3 py-2 border-b font-semibold text-gray-500">{h}</th>)}</tr></thead><tbody>{donationRows.slice(0,3).map((r,i)=><tr key={i}>{headers.slice(0,8).map(h=><td key={h} className="px-3 py-2 border-b text-gray-600">{String(r[h]).slice(0,60)}</td>)}</tr>)}</tbody></table></div>
      <div className="mt-4 flex flex-wrap gap-2 justify-end"><button disabled={busy} onClick={()=>setPreview(false)} className="px-4 py-2 rounded-lg border bg-white">Cancel</button><button disabled={busy} onClick={importDonations} className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium"><CheckCircle2 size={15} className="inline mr-2"/>{busy?"Importing...":"Import Donations"}</button></div>
    </div>}
    {busy && !preview && <p className="text-sm text-gray-500 mt-4">Processing...</p>}{message&&<p className="text-sm text-green-600 mt-4">{message}</p>}{error&&<p className="text-sm text-red-600 mt-4">{error}</p>}
    <p className="text-xs text-gray-400 mt-4">Donation matching checks Contact/ID first, then email, phone, or first/last name. If a matched contact has a group, that group's ID is saved on the donation.</p>
  </div>;
}
