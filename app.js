(() => {
  const baseBank = window.QUESTION_BANK || [];
  const $ = id => document.getElementById(id);
  const storeKey = 'food-engineering-quiz-v1';
  const saved = JSON.parse(localStorage.getItem(storeKey) || '{}');
  const state = {
    answers: saved.answers || {}, favorites: saved.favorites || {}, edits: saved.edits || {},
    selectedChapters: new Set(saved.selectedChapters || [...new Set(baseBank.map(q => q.chapter))]),
    mode: saved.mode || 'sequence', index: 0, order: [], retryAnswers: {}, theme: saved.theme || 'light'
  };
  const chapters = [...new Set(baseBank.map(q => q.chapter))];
  const letters = ['A','B','C','D','E','F'];

  function persist(){localStorage.setItem(storeKey,JSON.stringify({...state,selectedChapters:[...state.selectedChapters],order:undefined,index:undefined}));}
  function question(q){return state.edits[q.id]?{...q,...state.edits[q.id]}:q;}
  function shuffle(list){const x=[...list];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x;}
  function rebuild(keepId){
    let list=baseBank.filter(q=>state.selectedChapters.has(q.chapter));
    if(state.mode==='wrong') list=list.filter(q=>state.answers[q.id]&&state.answers[q.id]!==q.answer);
    if(state.mode==='random') list=shuffle(list);
    state.order=list.map(q=>q.id);
    const found=keepId?state.order.indexOf(keepId):-1;
    state.index=found>=0?found:Math.min(state.index,Math.max(0,state.order.length-1));
    render();
  }
  function current(){const id=state.order[state.index];return question(baseBank.find(q=>q.id===id));}
  function renderChapters(){
    $('chapterList').innerHTML=chapters.map(c=>`<button class="chapter-chip ${state.selectedChapters.has(c)?'active':''}" data-chapter="${c}">${c.replace('第','').replace('章','')}</button>`).join('');
  }
  function renderStats(){
    const vals=Object.entries(state.answers);const correct=vals.filter(([id,a])=>baseBank.find(q=>q.id===id)?.answer===a).length;
    $('doneStat').textContent=vals.length;$('accuracyStat').textContent=vals.length?Math.round(correct/vals.length*100)+'%':'—';$('wrongStat').textContent=vals.length-correct;
  }
  function render(){
    renderChapters();renderStats();
    document.body.classList.toggle('dark',state.theme==='dark');
    [...$('modeSwitch').children].forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
    const q=current();
    if(!q){$('questionCard').innerHTML='<div class="empty"><h2>这里暂时没有题目</h2><p>换个章节，或先做几道题再来刷错题。</p></div>';$('positionText').textContent='0 / 0';$('progressBar').style.width='0';return;}
    if(!$('stem')) location.reload();
    $('chapterBadge').textContent=q.chapter;$('questionNo').textContent=`第 ${q.number} 题`;
    $('positionText').textContent=`${state.index+1} / ${state.order.length}`;$('progressBar').style.width=`${(state.index+1)/state.order.length*100}%`;
    $('stem').textContent=q.stem;$('starBtn').textContent=state.favorites[q.id]?'★':'☆';$('starBtn').classList.toggle('active',!!state.favorites[q.id]);
    const answered=state.mode==='wrong'?state.retryAnswers[q.id]:state.answers[q.id];
    $('options').innerHTML=q.options.map((o,i)=>{const l=letters[i],cls=answered?(l===q.answer?'correct':l===answered?'wrong':''):'',mark=answered?(l===q.answer?'✓':l===answered?'×':''):'';return `<button class="option ${cls}" data-answer="${l}" ${answered?'disabled':''}><span class="option-letter">${l}</span><span>${escapeHtml(o)}</span><span class="option-mark">${mark}</span></button>`}).join('');
    $('feedback').innerHTML=answered?(answered===q.answer?'<strong>答对了。</strong> 这题已经拿下。':`<strong>答错了。</strong> 正确答案是 ${q.answer}，已自动加入错题。`):'选择一个答案后立即判定。';
    $('prevBtn').disabled=state.index===0;$('nextBtn').disabled=state.index>=state.order.length-1;
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function answer(letter){const q=current();if(!q||!q.options[letters.indexOf(letter)])return;if(state.mode==='wrong'){if(state.retryAnswers[q.id])return;state.retryAnswers[q.id]=letter;state.answers[q.id]=letter}else{if(state.answers[q.id])return;state.answers[q.id]=letter}persist();render();}
  function move(delta){state.index=Math.max(0,Math.min(state.order.length-1,state.index+delta));render();window.scrollTo({top:0,behavior:'smooth'});}

  $('chapterList').addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(!b)return;const c=b.dataset.chapter;if(state.selectedChapters.has(c)){if(state.selectedChapters.size>1)state.selectedChapters.delete(c)}else state.selectedChapters.add(c);persist();rebuild(current()?.id)});
  $('selectAllBtn').onclick=()=>{state.selectedChapters=new Set(chapters);persist();rebuild()};
  $('modeSwitch').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b)return;state.mode=b.dataset.mode;state.retryAnswers={};state.index=0;persist();rebuild()};
  $('options').onclick=e=>{const b=e.target.closest('[data-answer]');if(b)answer(b.dataset.answer)};
  $('prevBtn').onclick=()=>move(-1);$('nextBtn').onclick=()=>move(1);
  $('starBtn').onclick=()=>{const q=current();state.favorites[q.id]=!state.favorites[q.id];persist();render()};
  $('sourceBtn').onclick=()=>{const q=current();if(q)window.open(q.source,'_blank')};
  $('themeBtn').onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';persist();render()};
  $('resetBtn').onclick=()=>{if(confirm('清空所有作答、错题与收藏记录？本地勘误会保留。')){state.answers={};state.favorites={};persist();rebuild()}};
  document.addEventListener('keydown',e=>{if($('editDialog').open)return;const k=e.key.toUpperCase();if(letters.includes(k))answer(k);else if(e.key==='Enter')move(1);else if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1)});

  $('editBtn').onclick=()=>{const q=current();if(!q)return;$('editStem').value=q.stem;$('editOptions').innerHTML=q.options.map((o,i)=>`<label>选项 ${letters[i]}<input data-edit-option="${i}" value="${escapeHtml(o)}"></label>`).join('');$('editDialog').showModal()};
  $('editForm').addEventListener('submit',e=>{if(e.submitter?.value!=='save')return;const q=current();state.edits[q.id]={stem:$('editStem').value.trim(),options:[...document.querySelectorAll('[data-edit-option]')].map(x=>x.value.trim())};persist();setTimeout(render)});
  $('restoreBtn').onclick=()=>{const q=current();delete state.edits[q.id];persist();$('editDialog').close();render()};

  rebuild();
})();
