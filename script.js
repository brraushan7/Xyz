// ---------- DATA ----------
// Food needs: o=oxygen barrier, m=moisture barrier, l=light barrier, s=strength (1-5)
const FOODS = {
  grains:  {n:"Grains & Pulses", i:"🌾", o:2,m:4,l:1,s:4, tip:"Keep moisture below 12% and use insect-proof packs."},
  fruitveg:{n:"Fruits & Vegetables", i:"🍎", o:1,m:2,l:1,s:4, breathe:true, tip:"Produce respires — use ventilated or perforated packaging to avoid rotting."},
  dairy:   {n:"Dairy", i:"🥛", o:4,m:4,l:4,s:3, tip:"Light destroys milk vitamins — choose opaque packs."},
  snacks:  {n:"Snacks & Chips", i:"🍟", o:5,m:5,l:4,s:2, tip:"Nitrogen flushing keeps chips crisp and stops fat rancidity."},
  spices:  {n:"Spices & Masala", i:"🌶️", o:4,m:5,l:4,s:2, tip:"Aroma escapes fast — high-barrier, airtight packs are best."},
  oils:    {n:"Oils & Ghee", i:"🫒", o:4,m:3,l:5,s:3, tip:"Oxygen + light cause rancidity. Avoid clear packs."},
  meat:    {n:"Meat & Fish", i:"🐟", o:5,m:4,l:2,s:3, tip:"Vacuum or MAP packing with strict cold chain."},
  drinks:  {n:"Beverages", i:"🧃", o:4,m:3,l:3,s:4, tip:"Carbonated drinks need pressure-safe containers."},
  bakery:  {n:"Bakery", i:"🍞", o:3,m:3,l:1,s:2, tip:"Some breathability avoids soggy crust and mould."},
  rte:     {n:"Ready-to-Eat", i:"🍱", o:5,m:5,l:4,s:3, tip:"Retort or high-barrier pouches give long shelf life."}
};
// Materials: o,m,l,s = barrier scores; eco & cost (5 = best / cheapest); avoid = storages unsuitable
const MATS = [
  {n:"PET Bottle / Jar",o:3,m:4,l:2,s:4,eco:3,c:4,avoid:[],note:"Clear, light, recyclable. Good for drinks and oils."},
  {n:"HDPE Container",o:2,m:5,l:3,s:4,eco:3,c:4,avoid:[],note:"Strong moisture barrier, safe for frozen and dairy."},
  {n:"LDPE Film Bag",o:2,m:3,l:1,s:2,eco:2,c:5,avoid:[],note:"Cheap and flexible for short shelf life."},
  {n:"Multilayer Laminate (MAP)",o:5,m:5,l:4,s:3,eco:1,c:3,avoid:[],note:"Best all-round barrier. Hard to recycle."},
  {n:"Aluminium Foil Pouch",o:5,m:5,l:5,s:3,eco:2,c:2,avoid:[],note:"Total light and gas barrier for premium products."},
  {n:"Glass Jar",o:5,m:5,l:3,s:2,eco:4,c:2,avoid:["frozen"],note:"Inert and reusable, but heavy and fragile."},
  {n:"Tin Can",o:5,m:5,l:5,s:5,eco:4,c:2,avoid:[],note:"Retort-safe, very long shelf life."},
  {n:"Paperboard Carton",o:1,m:1,l:4,s:3,eco:5,c:4,avoid:["frozen"],note:"Eco-friendly outer pack, needs a liner for wet foods."},
  {n:"Aseptic Carton",o:4,m:4,l:5,s:3,eco:3,c:3,avoid:[],note:"Room-temp shelf life for milk and juice."},
  {n:"PLA Bio-plastic",o:2,m:2,l:1,s:2,eco:5,c:2,avoid:["frozen"],note:"Compostable, but limited barrier."},
  {n:"Jute / Woven PP Bag",o:1,m:2,l:1,s:5,eco:4,c:5,avoid:["frozen","chilled"],note:"Bulk grain bags, breathable and strong."},
  {n:"Corrugated Box + Perforated Liner",o:1,m:2,l:3,s:5,eco:4,c:4,breathe:true,avoid:["frozen"],note:"Ventilated crate for fresh produce."}
];
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const sel = {storage:"ambient",shelf:"short",dist:"local",budget:"mid"};

// ---------- NAV ----------
function show(id){
  $$(".page").forEach(p=>p.classList.toggle("on",p.id===id));
  $$("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===id));
  scrollTo({top:0});
}
$("#tabs").addEventListener("click",e=>{const t=e.target.dataset.tab;if(t)show(t)});
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

// ---------- FORM SETUP ----------
Object.entries(FOODS).forEach(([k,f])=>{
  $("#food").insertAdjacentHTML("beforeend",`<option value="${k}">${f.i} ${f.n}</option>`);
  const c=document.createElement("button");
  c.className="chip";c.innerHTML=`<i>${f.i}</i>${f.n}`;
  c.onclick=()=>{$("#food").value=k;show("rec");run()};
  $("#quick").appendChild(c);
});
["storage","shelf","dist","budget"].forEach(id=>{
  $("#"+id).addEventListener("click",e=>{
    const v=e.target.dataset.v;if(!v)return;
    sel[id]=v;$$("#"+id+" button").forEach(b=>b.classList.toggle("on",b===e.target));
  });
});
const ecoLabels=["Low","Medium","High"];
$("#eco").oninput=e=>$("#ecoVal").textContent=ecoLabels[e.target.value];
$("#go").onclick=run;

// ---------- RECOMMENDATION ENGINE ----------
function recommend(){
  const f=FOODS[$("#food").value];
  const boost = sel.shelf==="long"?1:0;              // longer life needs better barriers
  const req={o:Math.min(5,f.o+boost),m:Math.min(5,f.m+boost),l:f.l,s:Math.min(5,f.s+(sel.dist==="export"?1:sel.dist==="state"?.5:0))};
  const wEco=[.08,.15,.3][$("#eco").value], wCost={low:.3,mid:.15,high:.05}[sel.budget];
  const wFit=1-wEco-wCost;
  return MATS.map(m=>{
    let short=0;
    ["o","m","l","s"].forEach(k=>short+=Math.max(0,req[k]-m[k]));
    let fit=1-short/12;
    if(f.breathe) fit += m.breathe?.25:(m.o>=4?-.3:0);  // produce needs breathing
    if(sel.storage==="chilled"&&m.m>=4) fit+=.03;
    if(m.avoid.includes(sel.storage)) fit-=.5;
    const overkill = (m.o+m.m+m.l)/15 > .85 && (req.o+req.m+req.l)/15 < .5 ? .05 : 0; // avoid wasting premium pack
    const score=Math.max(0,Math.min(1, wFit*fit + wEco*m.eco/5 + wCost*m.c/5 - overkill));
    return {...m,score:Math.round(score*100),req,fit,bad:m.avoid.includes(sel.storage)};
  }).sort((a,b)=>b.score-a.score);
}

function run(){
  const f=FOODS[$("#food").value], list=recommend().slice(0,3);
  const bars=(m)=>[["Oxygen","o"],["Moisture","m"],["Light","l"],["Strength","s"]]
    .map(([l,k])=>`<div class="bar"><span>${l}</span><div><i style="width:${m[k]*20}%"></i></div><b>${m[k]}</b></div>`).join("");
  $("#results").innerHTML =
    `<h2>Top picks for ${f.i} ${f.n}</h2>`+
    list.map((m,i)=>`<article class="res ${i===0?"best":""}">
      <div class="head"><h3>${m.n}${i===0?'<span class="badge">Best match</span>':""}</h3><div class="score">${m.score}%</div></div>
      ${bars(m)}
      <p class="note">${m.note}</p>
      <p class="muted">🌱 Eco ${m.eco}/5 · 💰 Cost ${m.c<=2?"High":m.c===3?"Medium":"Low"}</p>
    </article>`).join("")+
    `<div class="warn">💡 ${f.tip}</div>`+
    (sel.storage==="frozen"?`<div class="warn">❄️ Frozen storage: avoid brittle materials like glass and paperboard without a liner.</div>`:"")+
    (sel.shelf==="long"?`<div class="warn">⏳ For 6+ months, add an oxygen absorber or nitrogen flushing.</div>`:"");
  $("#results").scrollIntoView({behavior:"smooth"});
}

// ---------- COMPARE TABLE ----------
let sortKey="n",asc=true;
function drawTable(){
  const cols=[["n","Material"],["o","O₂"],["m","Moisture"],["l","Light"],["s","Strength"],["eco","Eco"],["c","Cost ↓"]];
  const rows=[...MATS].sort((a,b)=>(a[sortKey]>b[sortKey]?1:-1)*(asc?1:-1));
  $("#table").innerHTML=`<tr>${cols.map(c=>`<th data-k="${c[0]}">${c[1]}</th>`).join("")}</tr>`+
    rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c[0]]}</td>`).join("")}</tr>`).join("");
}
$("#table").onclick=e=>{const k=e.target.dataset.k;if(!k)return;asc=(k===sortKey)?!asc:false;sortKey=k;drawTable()};
drawTable();

// ---------- TIPS ----------
const TIPS=[
 ["Match barrier to food","Oily foods need oxygen and light barrier. Dry foods need moisture barrier."],
 ["Think about the cold chain","Frozen foods need flexible, low-temperature-safe films."],
 ["Reduce plastic where you can","Paper, glass, tin and PLA suit products with short or medium shelf life."],
 ["Test before scaling","Run a small shelf-life trial with your chosen pack."],
 ["Label clearly","Show batch, expiry, storage instructions and FSSAI details."]
];
$("#tipList").innerHTML=TIPS.map(t=>`<div class="tip"><b>${t[0]}</b>${t[1]}</div>`).join("");
