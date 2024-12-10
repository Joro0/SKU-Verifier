// Upload Elements
const upload = document.getElementById("input");
const file1 = document.getElementById("file1");
const file2 = document.getElementById("file2");
const type1 = document.getElementById("file1-type");
const type2 = document.getElementById("file2-type");
const resultSku = document.getElementById("result-sku");
const resultFiltered = document.getElementById("result-filtered");
const resultDescription = document.getElementById("result-description");
const audio = document.getElementById("notification");

// Process Elements
const checkSku = document.getElementById("check");
const resultMatch = document.getElementById("result-match");
const resultComercial = document.getElementById("result-comercial");
const resultRecognized = document.getElementById("result-recognized");
const resultNoMatch = document.getElementById("result-nomatch");
const resultValidate = document.getElementById("result-validate");
const resultNoSku = document.getElementById("result-nosku");
const resultUnrecognized = document.getElementById("result-unrecognized");
const csvLink = document.getElementById("download-link")

// Variables
let skuList;
let descriptionList;
let skuSetOficial = new Set();
let descpListOficial = [];
let resultArr;
let resultStrArr;
let skuTypes;

upload.addEventListener("change",async function(){
  await uploadFile(upload.files[0]);
  upload.value="";
});

checkSku.addEventListener("click",function(){
  if(skuSetOficial.size > 0 && descpListOficial.length > 0){
    processFiles();
    getDownloadLink();
  }
  else alert('The required files are incomplete for the check. Please upload the remaining files.');
});

//-----------------------------------------------------------
// FUNCTIONS
//-----------------------------------------------------------

async function uploadFile(file) {  
// upload file, verify content and write data cleaned.
  try {
    if (type1.innerText==='-' || type2.innerText==='-'){
      const fileName = file.name;
      const data = await readXlsxFile(file);
      const typeName = data[0][0].toString().toUpperCase();

      if(data[0].length === 1 && (typeName.includes('DESCRIPCIÓN') || typeName.includes('DESCRIPCION'))){
        if(type1.innerText.includes('descp')) {
          alert('There is already a description file. Please delete it before upload another one.');
          return;
        }
        descriptionList = data.map(column => column[0]);
        descriptionList.shift();
        descpListOficial = getDescriptionCleaned(data);
        
        writeFileAndType(fileName,"descp");
        resultDescription.innerHTML = descpListOficial.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
        audio.play();
      }
      else if(data[0].length === 2 && typeName === "SKU"){
        if(type1.innerText.includes('sku')) {
          alert('There is already a sku file. Please delete it before upload another one.');
          return;
        }
        skuList = data.map(column => column[0]);
        skuList = skuList.filter(value => value !== null);
        skuSetOficial = getSkuCleaned(data);
        skuTypes = getSkuTypes(Array.from(skuSetOficial));
        
        writeFileAndType(fileName,"sku");
        resultSku.innerHTML = (skuList.length-1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
        resultFiltered.innerHTML = skuSetOficial.size.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
        audio.play();
      }
      else{
        alert('Unidentified file. Need a Sku or Description header.');
      }
    }
    else{
      alert('There are already 2 files. Delete one to upload a new file.');
    } 
  }
  catch (error) {
    console.error(error);
    alert('An error occurred. Please try again.');
  }
}

function getSkuCleaned(data){
  let skuOficial = [];
  for (let i = 0; i < data[0].length; i++) {
    let skuCol =  data.map(column => column[i]);
    skuCol = skuCol.filter(value => value !== null);
    skuCol.shift();
    skuCol = skuCol.map(String);
    skuCol = skuCol.filter(str => /^[a-zA-Z0-9]+$/.test(str));
    skuCol = skuCol.map(str => str.toUpperCase());
    skuOficial.push(...skuCol);
  }
  skuOficial = skuOficial.sort((a,b) => b.length - a.length);
  return new Set(skuOficial);
}

function getDescriptionCleaned(data){
  let descpFiltered = data.map(column => column[0]);
  descpFiltered = descpFiltered.filter(value => value !== null);
  descpFiltered.shift();
  descpFiltered = descpFiltered.map(String);
  descpFiltered = descpFiltered.map(str => str.toUpperCase());
  descpFiltered = descpFiltered.map(function(str) {
    if(str.includes('VALOR SOLO PARA EFECTOS DE ADUANA') || str.includes('SIN VALOR COMERCIAL')){ // special case -> sku irrelevant
      return 'COMERCIAL';
    }
    else if (str.indexOf('SKU') !== -1) {     //check 'SKU' on description and remove text before 'SKU'
      return str.replace(/^.*?\bSKU/, 'SKU');
    }
    else {
      return '';
    }
  });
  descpFiltered = descpFiltered.map(function(str){    // remove '-' in SKUs
    return str.replace(/(\d+)-(\d|[A-Z])\b/g, '$1$2');
  })
  return descpFiltered;
}

function writeFileAndType(fileName, fileType){
  if(file1.innerText == "-"){
    file1.innerText = fileName;
    type1.innerHTML = `${fileType}<span  class="delete-icon" onclick="deleteFile(type1,1)">x</span>`;
  }
  else{
    file2.innerHTML = fileName;
    type2.innerHTML = `${fileType}<span  class="delete-icon" onclick="deleteFile(type2,2)">x</span>`;
    file2.classList.add('delete-file');
  }
}

function processFiles(){
  try{
    // Verifying SKUs in description
    resultArr = [];
    resultStrArr = ['Item;State;Description Sku;Result;Short Description;Comercial Description'];
    let item = 1;
    for(let description of descpListOficial){
      let resultObj={
        item: item,
        shortDescription: description,
        comercialDescription: descriptionList[item-1],
        state: '',
        skuFromDescription: '',
        result: ''
      };
      const skuDescription = getSkuFromDescription(description);
      //single SKU case
      if(skuDescription.length===1){
        switch(skuDescription[0]){
          case 'COMERCIAL':
            resultObj.state = 'COMERCIAL';
            resultObj.skuFromDescription = '-';
            resultObj.result = '-';
            break;
          case 'NO SKU':
            resultObj.state = 'NO SKU';
            resultObj.skuFromDescription = '-';
            resultObj.result = '-';
            break;
          case 'VALIDATE':
            resultObj.state = 'VALIDATE';
            resultObj.skuFromDescription = '-';
            resultObj.result  = '-';
            break;
          default:
            //normal case: 12345
            if(/^[\dA-Z]+$/.test(skuDescription)){
              if(skuSetOficial.has(skuDescription[0])){
                resultObj.state = 'MATCH';
                resultObj.skuFromDescription = skuDescription[0];
                resultObj.result = skuDescription[0];
              }
              else{
                resultObj.state = 'NO MATCH';
                resultObj.skuFromDescription = skuDescription[0];
                resultObj.result = '-';
              }
            }
            //validate case: 1234 1
            else{
              //resultObj.state = 'VALIDATE';
              resultObj.skuFromDescription = skuDescription[0];
              //resultObj.result = getSkuHint(skuDescription[0], skuSetOficial);
              const [possibleResults, matchCase] = getSkuHint(skuDescription[0], skuSetOficial);
              
              if(matchCase){
                resultObj.state = 'MATCH';
                resultObj.result = possibleResults;
              }
              else{
                resultObj.state = 'VALIDATE';
                resultObj.result = possibleResults;
              }
            }
        }
      }
      //double SKU case
      else{
        const skuResultArr = [];
        for(let skuFromArr of skuDescription){
          if(skuSetOficial.has(skuFromArr)) skuResultArr.push(skuFromArr); 
        }
        switch(skuResultArr.length){
          case 0:
            resultObj.state = 'NO MATCH';
            if(skuDescription[2]==='DOUBLE') skuDescription.pop();
            resultObj.skuFromDescription = skuDescription.join('/');
            resultObj.result = '-';
            break;
          case 1:
            //case: SKU: 12345 // T42550 -> just one can be SKU
            if(skuDescription[2]==='DOUBLE'){
              resultObj.state = 'MATCH';
              skuDescription.pop();
              resultObj.skuFromDescription = skuDescription.join('/');
              resultObj.result = skuResultArr[0];
            }
            //case: SKU: 12345 ... SKU: T5303
            else{
              resultObj.state = 'VALIDATE';
              resultObj.skuFromDescription = skuDescription.join('/');
              resultObj.result = skuResultArr[0];
            }
            break;
          default:
            resultObj.state = 'VALIDATE';
            if(skuDescription[2]==='DOUBLE') skuDescription.pop();
            resultObj.skuFromDescription = skuDescription.join('/');
            resultObj.result = skuResultArr.join('/');
        }
      }
      resultArr.push(resultObj);
      resultStrArr.push(`${resultObj.item};${resultObj.state};${resultObj.skuFromDescription};${resultObj.result};${resultObj.shortDescription};${resultObj.comercialDescription}`);
      item++;
    }
    const totalMatch = resultArr.filter(descp => descp.state === 'MATCH').length;
    const totalComercial = resultArr.filter(descp => descp.state === 'COMERCIAL').length;
    const totalNoMatch = resultArr.filter(descp => descp.state === 'NO MATCH').length;
    const totalValidate = resultArr.filter(descp => descp.state === 'VALIDATE').length;
    const totalNoSku = resultArr.filter(descp => descp.state === 'NO SKU').length;

    resultMatch.innerHTML=totalMatch.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
    resultComercial.innerHTML=totalComercial.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
    resultRecognized.innerHTML=(totalMatch+totalComercial).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
    resultNoMatch.innerHTML=totalNoMatch.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
    resultValidate.innerHTML=totalValidate.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
    resultNoSku.innerHTML=totalNoSku.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
    resultUnrecognized.innerHTML=(totalNoMatch+totalValidate+totalNoSku).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
  }
  catch (error) {
    console.error(error);
    alert('An error occurred. Please try again.');
  }
}

function getSkuFromDescription(description){
  /* SKU results:
    1. COMERCIAL  -> doesnt need sku check
    2. NO SKU    -> doesnt need sku check
    3. VALIDATE    -> doesnt need sku check
    4. SKU        -> need sku check
    5. SKU1,SKU2  -> need sku check
  */
    //case: withouth SKU in description
    if(description==='COMERCIAL') return ['COMERCIAL'];
    if(description==='') return ['NO SKU'];
    
    //case: single SKU in description (SKU: ...)
    if(description.match(/SKU/g).length === 1){   //SKU: ...
      //case: double pattern (G323T // 1234X) (alphanumeric with > 3 digits)
      const doublePatternStr = '([A-Z0-9]*\\d{2,}[A-Z0-9]*)';
      const doublePatternMatch = patternMatch(description,`SKU[^A-Z\\d]*?${doublePatternStr}\\s*\\/\\/\\s*${doublePatternStr}`);
      if(doublePatternMatch !== null && doublePatternMatch.length === 3){
        let filtredMatch = new Set([doublePatternMatch[1],doublePatternMatch[2]]);
        filtredMatch = Array.from(filtredMatch);
        if(filtredMatch.length === 1) return [filtredMatch[0]];
        else return [filtredMatch[0],filtredMatch[1],'DOUBLE'];
      }
      //case: normal pattern (1234,1234X) (digits>3,digits>3+X)
      const normalPatternMatch1 = patternMatch(description,`SKU[^\\d]*?(\\d{4,}X?)(?!\\d)`) //SKU: 1234X or 12345
      if(normalPatternMatch1 !== null){
        if(normalPatternMatch1[1].includes('X')) return [normalPatternMatch1[1]]; //SKU: 1234X
        else{
          const normalPatternMatch2 = patternMatch(description,`${normalPatternMatch1[1]}\\s\\d+(?!\\d)`); //SKU: 12345 1
          if(normalPatternMatch2 !== null) return [normalPatternMatch2[0]];
        }
        return [normalPatternMatch1[1]];  //SKU: 12345
      }
      else{ 
        const normalPatternMatch3 = patternMatch(description, `SKU[^\\d]*?(\\d+[^\\d]\\d+X?)(?!\\d)`);  //SKU: 12 345X
        if(normalPatternMatch3 !== null && normalPatternMatch3[1].replace(/[^a-zA-Z0-9]/g,'').length > 3) return [normalPatternMatch3[1]]; 
      }
  
      //case: special pattern (T50, T0R3D, 70) (alphanumerics>1digit)
      const specialPatternMatch1 = patternMatch(description,`SKU[^A-Z\\d]*?([A-Z0-9]*\\d{2,}[A-Z0-9]*)\\s[A-Z\\d]`);  //SKU: T0R3D 1
      if(specialPatternMatch1 !== null) return ['VALIDATE'];
      const specialPatternMatch2 = patternMatch(description,`SKU[^A-Z\\d]*?([A-Z0-9]*\\d{2,}[A-Z0-9]*)`);
      if(specialPatternMatch2 !== null) return [specialPatternMatch2[1]];
  
      return ['NO SKU'];
    }
    //case: double SKU in description (SKU:... SKU:...)
    else{
      const regex = /SKU[^A-Z\d]*?([A-Z0-9]*\d{2,}[A-Z0-9]*)/g;
      let match;
      let matchedValue = [];
      //gets array of sku matches, and operates each of them before it is removed
      while ((match = regex.exec(description)) !== null) matchedValue.push(match[1]);
      const matchedValueSet = new Set(matchedValue);
      matchedValue = Array.from(matchedValueSet);
      if(matchedValue.length!==0) return matchedValue;
      return ['VALIDATE']
    }
  }

function patternMatch(text,regexpString){
  const patternReg = new RegExp(regexpString);
  return text.match(patternReg);
}
  
function getSkuHint(sku, skuList){
  let longestSku = '';
  let onlyLongest = false;
  const attachSku = sku.replace(/[^A-Z0-9]/g,'');
  const possibleResults = []
  
  for(let pattern of sku.match(/[\dA-Z]+/g)) {    //get the longest pattern (1234 5 -> 1234)
    if(pattern.length > longestSku.length) longestSku = pattern;
  }
  if(skuList.has(longestSku)) {
    possibleResults.push(longestSku);
    onlyLongest = true;
  }
  if(longestSku!==sku && skuList.has(attachSku)) {
    possibleResults.push(attachSku);
    onlyLongest = false;
  }

  let strResults = possibleResults.join('/');
  if(possibleResults.length!==0) return [strResults,onlyLongest];
  else return ['-',onlyLongest];
}

function getDownloadLink(){
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.getMonth()+1;
  const year = currentDate.getFullYear();
  csvLink.textContent='sku_result_'+day+'-'+month+'-'+year+'.csv';
  csvLink.style.visibility = 'visible';

  const csvData = resultStrArr.join('\n');
  const blob = new Blob([csvData], {type:'application/csv'});
  const url = URL.createObjectURL(blob);
  csvLink.download='sku_result_'+day+'-'+month+'-'+year+'.csv';
  csvLink.href=url;
}

function deleteFile(typeElement,fileNumber) {
  if(typeElement.innerText.includes('sku')){
    resultSku.innerHTML='-';
    resultFiltered.innerHTML='-';
    skuSetOficial = new Set();
  }
  else{
    resultDescription.innerHTML='-';
    descpListOficial = [];
  }
  switch (fileNumber) {
    case 1:
      file1.innerHTML='-';
      type1.innerHTML='-';
      break;
  
    case 2:
      file2.innerHTML='-';
      type2.innerHTML='-';
      break;
  }
}

function getSkuTypes(skuList){
  /* SKUs:
    1. 1234   -> digitos > 3        (7924)
    2. 1234X  -> digitos > 3 + X    (753)
    3. 123    -> digitos < 4        (3)
    4. T50    -> letras + digitos   (2) (TE30R, T50)
  */ 
    let skuDigitsMax = [];
    let skuDigitsMin = [];
    let skuDigitsX = [];
    let skuDigitsLetters = [];
    let skuOthers = [];

    for(let sku of skuList){
      if(/^\d+$/.test(sku)){
        if(sku.length > 3){
              skuDigitsMax.push(sku);
          }
          else{
            skuDigitsMin.push(sku);
          }
      }
      else if (/^\d+X$/.test(sku)){
        if(sku.length > 3){
          skuDigitsX.push(sku);
        }
        else{
          skuDigitsLetters.push(sku);
        }
      }
      else if (/^[a-zA-Z0-9]+$/.test(sku)){
        skuDigitsLetters.push(sku);
      }
      else{
        skuOthers.push(sku);
      }
    }
    return [skuDigitsX, skuDigitsMax, skuDigitsMin.concat(skuDigitsLetters), skuOthers];
  }