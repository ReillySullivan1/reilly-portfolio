(function () {
  // Representative (illustrative) veterinary condition list — not a reproduction of any
  // proprietary insurer list, built to demonstrate list-length and synonym problems at scale.
  const base = ["Abscess","Acute Kidney Injury","Allergic Dermatitis","Anal Gland Impaction","Anemia","Anxiety / Stress Disorder","Arthritis","Aspiration Pneumonia","Asthma (Feline)","Atopic Dermatitis","Bee Sting / Insect Bite Reaction","Bladder Infection / Cystitis","Bladder Stones","Bloat / Gastric Dilatation-Volvulus","Bordetella","Brain Tumor","Bronchitis","Burns","Cancer - Lymphoma","Cancer - Mast Cell Tumor","Cancer - Osteosarcoma","Cardiomyopathy","Cataracts","Cherry Eye","Chronic Kidney Disease","Colitis","Congestive Heart Failure","Conjunctivitis","Corneal Ulcer","Cruciate Ligament Tear","Cushing's Disease","Deafness","Degenerative Myelopathy","Dental Disease","Dermatitis","Diabetes Mellitus","Diarrhea (Acute)","Dietary Indiscretion","Ear Hematoma","Ear Infection (Otitis Externa)","Eclampsia","Elbow Dysplasia","Entropion","Epilepsy / Seizures","Feline Leukemia Virus (FeLV)","Feline Lower Urinary Tract Disease","Fever of Unknown Origin","Flea Allergy Dermatitis","Foreign Body Ingestion","Fracture","Gastritis","Gastroenteritis","Giardia","Glaucoma","Head Trauma","Heart Murmur","Heartworm Disease","Heatstroke","Hemorrhagic Gastroenteritis","Hip Dysplasia","Hookworms","Hot Spot / Acute Moist Dermatitis","Hyperthyroidism","Hypoglycemia","Hypothyroidism","Immune-Mediated Hemolytic Anemia","Inflammatory Bowel Disease","Insect Bite Reaction","Intervertebral Disc Disease","Intestinal Obstruction","Kennel Cough","Kidney Failure (Acute)","Kidney Failure (Chronic)","Kidney Stones","Laryngeal Paralysis","Lens Luxation","Leptospirosis","Lick Granuloma","Liver Disease","Lyme Disease","Lymphoma","Mange (Demodectic)","Mange (Sarcoptic)","Mast Cell Tumor","Megaesophagus","Meningitis","Mitral Valve Disease","Nasal Discharge","Obesity","Osteoarthritis","Otitis Externa","Pancreatitis","Panosteitis","Parvovirus","Patellar Luxation","Periodontal Disease","Pneumonia","Poisoning / Toxin Ingestion","Portosystemic Shunt","Pyometra","Rabies Exposure","Renal Failure","Ringworm","Roundworms","Ruptured Anal Gland","Seizure Disorder","Skin Allergy","Snake Bite","Spinal Injury","Tapeworms","Tick Paralysis","Tooth Fracture","Torn ACL / Cruciate","Tracheal Collapse","Umbilical Hernia","Upper Respiratory Infection","Urinary Tract Infection","Uveitis","Valley Fever","Vestibular Disease","Vomiting (Acute)","Von Willebrand's Disease","Wart / Papilloma","Whipworms","Wound / Laceration"];
  const conditions = [...base].sort((a,b)=>a.localeCompare(b));

  const nativeSelect = document.getElementById('nativeSelect');
  conditions.forEach(c=>{
    const o = document.createElement('option');
    o.textContent = c;
    nativeSelect.appendChild(o);
  });
  document.getElementById('nativeCount').textContent = conditions.length;

  const comboInput = document.getElementById('comboInput');
  const comboList = document.getElementById('comboList');
  const comboStat = document.getElementById('comboStat');

  function renderCombo(query){
    comboList.innerHTML = '';
    const q = query.trim().toLowerCase();
    let matches = conditions;
    if(q.length){
      matches = conditions.filter(c => c.toLowerCase().includes(q));
    }
    if(matches.length === 0){
      const div = document.createElement('div');
      div.className = 'combo-empty';
      div.textContent = 'No matches. Try a symptom in plain words.';
      comboList.appendChild(div);
    } else {
      matches.slice(0,60).forEach(c=>{
        const div = document.createElement('div');
        if(q.length){
          const idx = c.toLowerCase().indexOf(q);
          div.innerHTML = c.slice(0,idx) + '<mark>' + c.slice(idx, idx+q.length) + '</mark>' + c.slice(idx+q.length);
        } else {
          div.textContent = c;
        }
        comboList.appendChild(div);
      });
    }
    comboStat.innerHTML = q.length
      ? '<b>' + matches.length + '</b> of ' + conditions.length + ' entries match "' + query + '"'
      : 'Matches update as you type. Symptoms and formal terms both resolve.';
  }
  renderCombo('');
  comboInput.addEventListener('input', (e)=> renderCombo(e.target.value));

  // ---- Tab switching ----
  document.querySelectorAll('.demo-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.demo-tab').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.demo-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).classList.add('active');
    });
  });

  // ---- Guided triage ----
  const categories = {
    "Skin & Coat": ["Allergic Dermatitis","Atopic Dermatitis","Dermatitis","Flea Allergy Dermatitis","Hot Spot / Acute Moist Dermatitis","Lick Granuloma","Mange (Demodectic)","Mange (Sarcoptic)","Ringworm","Skin Allergy","Ear Infection (Otitis Externa)","Anal Gland Impaction"],
    "Digestive": ["Colitis","Diarrhea (Acute)","Dietary Indiscretion","Gastritis","Gastroenteritis","Pancreatitis","Vomiting (Acute)","Bloat / Gastric Dilatation-Volvulus","Foreign Body Ingestion","Inflammatory Bowel Disease"],
    "Mobility & Joints": ["Arthritis","Torn ACL / Cruciate","Hip Dysplasia","Elbow Dysplasia","Intervertebral Disc Disease","Osteoarthritis","Patellar Luxation","Fracture"],
    "Breathing & Airway": ["Kennel Cough","Bronchitis","Asthma (Feline)","Bordetella","Pneumonia","Tracheal Collapse","Upper Respiratory Infection"],
    "Urinary & Kidney": ["Bladder Infection / Cystitis","Bladder Stones","Chronic Kidney Disease","Kidney Failure (Acute)","Kidney Stones","Urinary Tract Infection"],
    "Eyes, Ears & Neuro": ["Cataracts","Conjunctivitis","Corneal Ulcer","Glaucoma","Epilepsy / Seizures","Vestibular Disease","Deafness"],
    "Infectious & Parasitic": ["Heartworm Disease","Leptospirosis","Lyme Disease","Parvovirus","Giardia","Hookworms","Roundworms","Tapeworms","Whipworms","Tick Paralysis"],
    "Heart & Metabolic": ["Cardiomyopathy","Congestive Heart Failure","Heart Murmur","Diabetes Mellitus","Hyperthyroidism","Hypothyroidism","Obesity","Anemia"],
    "Injury, Dental & Other": ["Dental Disease","Periodontal Disease","Tooth Fracture","Wound / Laceration","Burns","Heatstroke","Poisoning / Toxin Ingestion","Anxiety / Stress Disorder"]
  };

  const triageChips = document.getElementById('triageChips');
  const triageBack = document.getElementById('triageBack');
  const triageResults = document.getElementById('triageResults');
  const triageResultsLabel = document.getElementById('triageResultsLabel');
  const triageStepLabel = document.getElementById('triageStepLabel');
  const triageStat = document.getElementById('triageStat');

  Object.keys(categories).forEach(cat=>{
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = cat;
    chip.addEventListener('click', ()=> selectCategory(cat, chip));
    triageChips.appendChild(chip);
  });

  function selectCategory(cat, chipEl){
    document.querySelectorAll('#triageChips .chip').forEach(c=>c.classList.remove('selected'));
    chipEl.classList.add('selected');
    triageBack.classList.add('show');
    triageResultsLabel.style.display = 'block';
    triageStepLabel.textContent = 'Step 1: Where is the issue?';
    triageResults.innerHTML = '';
    categories[cat].forEach(c=>{
      const row = document.createElement('div');
      row.textContent = c;
      row.addEventListener('click', ()=>{
        document.querySelectorAll('#triageResults div').forEach(d=>d.classList.remove('picked'));
        row.classList.add('picked');
        triageStat.innerHTML = 'Selected: <b>' + c + '</b>, reached in 2 taps, no clinical vocabulary required.';
      });
      triageResults.appendChild(row);
    });
    triageStat.innerHTML = '<b>' + categories[cat].length + '</b> conditions shown for "' + cat + '" instead of ' + conditions.length + '.';
  }
})();
