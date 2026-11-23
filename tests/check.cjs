const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2] || 'index.html','utf8');
const isFinal = source.includes('id="track"');
class Element {
  constructor(tag) {
    this.tag = tag; this.children = []; this.handlers = {}; this.style = {}; this.value = '';
    const classes = new Set();
    this.classList = {toggle(n){if (!classes.delete(n)) classes.add(n)}, remove(n){classes.delete(n)}, contains:n=>classes.has(n)};
  }
  replaceChildren(...nodes){this.children=nodes}
  appendChild(el){this.children.push(el);return el}
  insertRow(){return this.appendChild(new Element('tr'))}
  insertCell(){return this.appendChild(new Element('td'))}
  add(el){this.appendChild(el)}
  prepend(el){this.children.unshift(el)}
  setAttribute(){} focus(){focused=this} setCustomValidity(){} reportValidity(){} scrollIntoView(){}
  addEventListener(event,fn){this.handlers[event]=fn}
  trigger(event){this.handlers[event].call(this)}
}
let focused;
const nodes=new Map([...source.matchAll(/ id="([^"]+)"/g)].map(([,id])=>[id,new Element(id)]));
const el=id=>{assert(nodes.has(id),id);return nodes.get(id)};
if(isFinal){el('track').value='river';el('access').value='open'}
vm.runInNewContext(source.match(/<script>([\s\S]*?)<\/script>/)[1],{
  document:{getElementById:el,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)},
  setInterval(){},Option:class{constructor(label,value){this.label=label;this.value=value}}
});
const click=id=>el(id).trigger('click');
const bars=()=>el('callChart').children.filter(e=>e.tag==='rect').length;
assert.equal(bars(),12);
click('btnApprove');click('btnOverride');click('btnConfirmOverride');assert.equal(focused,el('altLocation'));
el('altLocation').value=isFinal?'Home base':'Highland Ridge FS-7 (Fictional)';
click('btnConfirmOverride');assert.equal(focused,el('overrideReason'));assert.equal(el('logList').children.length,1);
el('overrideReason').value='Reserve crew for local coverage.';
click('btnConfirmOverride');const entries=el('logList').children;assert.equal(entries.length,2);
assert.match(entries[0].innerHTML,/Overridden.*Reserve crew/);assert.match(entries[1].innerHTML,/Approved.*Northgate/);
if(isFinal){
  for(const [track,access,site,peak,mean] of [
    ['river','open','Northgate Community Center',127,'17.3 min at base  /  11.5 min staged'],
    ['river','closed','Eastwood High School',127,'17.3 min at base  /  12.6 min staged'],
    ['east','open','Eastwood High School',103,'16.6 min at base  /  10.2 min staged'],
    ['east','closed','Eastwood High School',103,'16.6 min at base  /  10.2 min staged']
  ]){
    el('track').value=track;el('access').value=access;el('access').trigger('change');
    assert.equal(bars(),12);assert.equal(el('site').textContent,'Stage at '+site);
    assert(el('warning').textContent.includes('Peak: '+peak+' calls at H+07'));assert.equal(el('means').textContent,mean);
    assert.equal(el('travel').children.length,2); assert.equal(entries.length,2);
    assert.equal(el('altLocation').children.some(o=>o.value===site),false);
    const hourly = el('forecastBody').children;
    assert.equal(hourly.length, 12);
    hourly.forEach((row, i) => {
      const [hour, river, east, sum] = row.children.map(cell => cell.textContent);
      assert.equal(hour, 'H+' + String(i + 1).padStart(2, '0'));
      assert.equal(river + east, sum);
      if (i === 6) assert.deepEqual([river, east, sum], track === 'river' ? [83, 44, 127] : [32, 71, 103]);
    });
    const range = el('riverMix');
    if (access === 'closed') {
      assert.match(el('threshold').textContent, /every split/);
    } else {
      const lastOriginal = track === 'river' ? 75 : 60;
      const firstSwitch = track === 'river' ? 74 : 61;
      const alternate = track === 'river' ? 'Eastwood High School' : 'Northgate Community Center';
      assert(el('threshold').textContent.includes(track === 'river' ? '9 peak calls' : '29 peak calls'));
      range.value = lastOriginal;
      range.trigger('input');
      assert(el('mixResult').textContent.includes(site));
      range.value = firstSwitch;
      range.trigger('input');
      assert(el('mixResult').textContent.includes(alternate));
    }
    for (const edge of [0, peak]) {
      range.value = edge;
      range.trigger('input');
      assert(el('mixResult').textContent.includes(edge + ' Riverside'));
      assert.equal(el('site').textContent, 'Stage at ' + site);
      assert.equal(el('logList').children.length, 2);
    }
    console.log(track,access,el('warning').textContent,mean,el('difference').textContent);
  }
}
console.log('Passed chart, approval, both required fields, and timestamped decision entries.');

