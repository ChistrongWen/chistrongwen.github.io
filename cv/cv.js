/* Academic CV records: update cv-data.json only. Other site pages are unaffected. */
(async function () {
  const url = new URL('./cv-data.json', document.currentScript.src);
  try {
    url.searchParams.set('_v', String(Date.now()));
    const response = await fetch(url, {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    let cv;
    try { cv = JSON.parse(raw); }
    catch (e) { throw new Error('cv-data.json is not valid JSON: ' + e.message); }
    if (!cv || typeof cv !== 'object' || Array.isArray(cv)) {
      throw new Error('cv-data.json must contain a JSON object.');
    }
    // Prefer the exact key used in cv-data.json; retain legacy compatibility.
    const reviews = cv['under_review/in preparation'] ?? cv.under_review;
    const expected = ['education','publications','talks','awards','teaching','outreach'];
    if (!Array.isArray(reviews)) throw new Error('Missing manuscripts array: under_review/in preparation');
    for (const key of expected) {
      if (!Array.isArray(cv[key])) throw new Error(`Missing or invalid array in cv-data.json: ${key}`);
    }
    function replaceItems(sectionId, className, records, build) {
      const list = document.querySelector(`#${sectionId} .${className}`);
      if (!list || !Array.isArray(records)) return;
      list.replaceChildren(...records.map(build));
    }
    function entry(item) {
      const li=document.createElement('li');
      const span=document.createElement('span'); span.className='date'; span.textContent=item.date || '';
      const div=document.createElement('div'); div.innerHTML=item.content_html || '';
      li.append(span,div); return li;
    }
    function para(item) {
      const p=document.createElement('p'); p.innerHTML=item.html || ''; return p;
    }
    for (const [id,key] of [['education','education'],['talks','talks'],['awards','awards']]) {
      replaceItems(id,'entries',cv[key],entry);
    }
    replaceItems('publications','pubs',cv.publications, item => {
      const li=document.createElement('li'); li.innerHTML=item.citation_html || ''; return li;
    });
    const review=document.querySelector('#under-review .wrap');
    if (review && Array.isArray(reviews)) {
      review.querySelectorAll(':scope > p').forEach(p=>p.remove());
      reviews.forEach(item=>review.append(para(item)));
    }
    const tags=document.querySelector('#interests .tags');
    if (tags && Array.isArray(cv.interests?.tags)) {
      tags.replaceChildren(...cv.interests.tags.map(value=>{
        const span=document.createElement('span'); span.className='tag'; span.textContent=value; return span;
      }));
    }
    const skills=document.querySelector('#interests .wrap > p');
    if (skills && typeof cv.interests?.skills_html==='string') skills.innerHTML=cv.interests.skills_html;
    for (const [id,key] of [['teaching','teaching'],['outreach','outreach']]) {
      const wrap=document.querySelector(`#${id} .wrap`);
      if (!wrap || !Array.isArray(cv[key])) continue;
      wrap.querySelectorAll(':scope > p').forEach(p=>p.remove());
      cv[key].forEach(item=>wrap.append(para(item)));
    }
  } catch(error) {
    console.error('Academic CV: unable to read cv-data.json; original HTML is displayed.',error);
    const main = document.querySelector('main');
    if (main && !document.querySelector('#cv-data-error')) {
      const alert = document.createElement('div');
      alert.id = 'cv-data-error';
      alert.setAttribute('role', 'alert');
      alert.style.cssText = 'max-width:940px;margin:18px auto;padding:14px 18px;border:1px solid #b94a48;border-radius:7px;background:#fff3f3;color:#7c2222;font:14px/1.6 Arial,sans-serif';
      alert.textContent = 'CV data could not be updated. The original records are displayed. Reason: ' + error.message + '. Check cv/cv-data.json and the browser Console.';
      main.prepend(alert);
    }
  }
})();
