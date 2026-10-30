/* Academic CV records: update cv-data.json only. Other site pages are unaffected. */
(async function () {
  const url = new URL('./cv-data.json', document.currentScript.src);
  try {
    const response = await fetch(url, {cache: 'no-cache'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const cv = await response.json();
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
    if (review && Array.isArray(cv.under_review)) {
      review.querySelectorAll(':scope > p').forEach(p=>p.remove());
      cv.under_review.forEach(item=>review.append(para(item)));
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
  }
})();
