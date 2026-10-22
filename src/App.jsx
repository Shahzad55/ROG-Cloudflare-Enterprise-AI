// Subject: General Persian document-grounded AI for shops, construction, and manufacturing teams.
// Plan: a calm document desk UI with an unmistakable "source-first" answer flow; palette from ink, paper, and Cloudflare orange.
import { useState } from 'react';
import './styles.css';
import './rtl.css';

const seedDocs = [
  { title: 'راهنمای مرجوعی کالا', type: 'فروشگاه', meta: '۱۲ صفحه · به‌روزرسانی امروز' },
  { title: 'قرارداد اجرای فاز دوم پروژه', type: 'ساختمانی', meta: '۸ صفحه · به‌روزرسانی دیروز' },
  { title: 'دستورالعمل کنترل کیفیت خط تولید', type: 'تولیدی', meta: '۲۱ صفحه · به‌روزرسانی ۳ روز پیش' },
];

export default function App() {
  const [industry, setIndustry] = useState('همه فضاها');
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(false);
  const [docs, setDocs] = useState(seedDocs);
  const [selected, setSelected] = useState(null);
  const ask = () => { if (question.trim()) setAsked(true); };
  const upload = () => setDocs([{ title: 'سند جدید شرکت شما', type: industry === 'همه فضاها' ? 'عمومی' : industry, meta: 'در حال آماده‌سازی برای جست‌وجو' }, ...docs]);

  return <main dir="rtl" lang="fa">
    <nav className="topbar"><div className="brand"><span className="mark">◈</span><span>سندیار</span><small>پاسخ از روی سند</small></div><div className="navlinks"><a className="active">فضای کاری</a><a>اسناد</a><a>گزارش اعتماد</a></div><button className="avatar">ش</button></nav>
    <section className="hero"><div className="eyebrow"><span className="pulse"></span> دستیار اسناد فارسی، آماده برای هر صنعت</div><h1>جواب درست،<br /><em>از سند درست.</em></h1><p>اسناد شرکتت را نگه دار، سؤال بپرس، و پاسخی بگیر که منبعش روشن است. نه حدس، نه جواب‌های بی‌پشتوانه.</p><div className="hero-actions"><button className="primary" onClick={upload}>＋ افزودن سند</button><button className="ghost">مشاهده راهنما <span>←</span></button></div><div className="trustline"><span>●</span> پاسخ‌ها فقط بر اساس اسناد انتخاب‌شده ساخته می‌شوند</div></section>
    <section className="workspace"><aside className="sidebar"><div className="side-head"><span>فضاهای کاری</span><button>＋</button></div>{['همه فضاها','فروشگاه آفتاب','پروژه آریا','کارخانه نوین'].map(x => <button key={x} className={`space ${industry===x?'chosen':''}`} onClick={()=>setIndustry(x)}><i className={x==='همه فضاها'?'all':''}></i>{x}<b>{x==='همه فضاها' ? docs.length : x==='فروشگاه آفتاب' ? '۱۲' : '۸'}</b></button>)}<div className="side-rule" /><div className="side-label">وضعیت اتصال</div><div className="connection"><span className="green"></span><div><strong>Cloudflare R2 + Vectorize</strong><small>همگام‌سازی فعال</small></div></div></aside>
      <div className="mainpanel"><div className="panelhead"><div><span className="kicker">فضای فعلی</span><h2>{industry}</h2></div><div className="stats"><span><strong>{docs.length}</strong> سند</span><span><strong>۹۸٪</strong> پوشش منبع</span></div></div><div className="askbox"><div className="ask-icon">✦</div><textarea dir="auto" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}}} placeholder="از اسناد شرکتت چیزی بپرس..."/><button onClick={ask}>پرسیدن <span>↗</span></button></div>{asked && <div className="answer"><div className="answer-top"><span className="answer-label"><i></i> پاسخ مستند</span><span className="confidence">اطمینان بالا · ۹۲٪</span></div><p dir="auto">بر اساس سندهای موجود، <strong>درخواست شما باید با قوانین فضای کاری بررسی شود.</strong> نزدیک‌ترین بخش‌های مرتبط در اسناد پیدا شد و پاسخ نهایی باید با منبع زیر تطبیق داده شود.</p><div className="source-chip" onClick={()=>setSelected(docs[0])}><span>↗</span><div><strong dir="auto">{docs[0]?.title}</strong><small>بخش ۳ · صفحه ۴</small></div><b>۰.۹۲</b></div></div>}<div className="docs-head"><h3>اسناد فضای کاری</h3><button onClick={upload}>بارگذاری سند <span>＋</span></button></div><div className="docgrid">{docs.map((d,i)=><article className="doc" key={i} onClick={()=>setSelected(d)}><div className="doc-icon">▤</div><div><h4 dir="auto">{d.title}</h4><span dir="auto">{d.type} · {d.meta}</span></div><button>•••</button></article>)}</div></div></section>
    {selected && <div className="modalback" onClick={()=>setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><span className="kicker">منبع سند</span><h2 dir="auto">{selected.title}</h2><p>این سند پس از بارگذاری در Cloudflare ذخیره می‌شود و بخش‌های مرتبط آن برای پاسخ‌گویی جست‌وجو خواهند شد.</p><div className="modalline"><span>نوع</span><strong>{selected.type}</strong></div><div className="modalline"><span>وضعیت</span><strong className="orange">آماده برای جست‌وجو</strong></div></div></div>}
  </main>
}
