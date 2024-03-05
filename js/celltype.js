if (!window.celltypeimported){

    window.celltypes = {
        "array": v => v instanceof Array || (typeof v === "string" && v.startsWith("[") && v.endsWith("]")),
        "object": v => v instanceof Object || (typeof v === "string" && v.startsWith("{") && v.endsWith("}")),
        "boolean": v => [true, false, "true", "false", "True", "False"].includes(v),
        "empty": v => v === "" || v === null || v === undefined,
        "image": v => v.startsWith("data:image") || v.endsWith(".jpg") || v.endsWith(".png") || v.endsWith(".gif") || v.endsWith(".svg"),
        "url": v => v.startsWith("http") || v.startsWith("www"),
        "email": v => v.startsWith("mailto:"),
        "currency": v => v.startsWith("$") && !isNaN(v.slice(1)),
        "hexcolor": v => v.startsWith("#") && !isNaN(v.slice(1)),
        "rgbcolor": v => v.startsWith("rgb(") && v.endsWith(")"),
        "percent": v => v.endsWith("%") && !isNaN(v.slice(0, -1)),
        "number": v => !isNaN(v),
        "date": v => !isNaN(new Date(v)),
        "time": v => new Date("1970-01-01T" + v) instanceof Date,
        "string": v => typeof v === "string"
    }

function detectCellType(value){
    let matchedTypes = [];
    for (let t in window.celltypes){
        try{
            if (window.celltypes[t](value)){
                matchedTypes.push(t);
            }
        }catch(e){
        }
    }
    return matchedTypes;
}

function setCellValue(cell, value, editable=false, preferences=[]){
    let matchedTypes = detectCellType(value);
    let existingTypes = matchedTypes.filter(t => cell.classList.contains(t));
    let preferredTypes = preferences.filter(t => matchedTypes.includes(t));
    let t = existingTypes.length > 0 ? existingTypes[0] : (preferredTypes.length > 0 ? preferredTypes[0] : matchedTypes[0])

    for (let ty of Object.keys(window.celltypes)){
        if (ty !== t){
            cell.classList.remove(ty);
        }
    }
    cell.classList.add(t);

    if (t === "boolean"){
        let checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        cell.appendChild(checkbox);
        if (!editable){
            checkbox.setAttribute('disabled', true);
        }
    }else if (t === "number"){
        cell.innerHTML = value;
    }else if (t === "date"){
        let date = document.createElement('input');
        date.type = 'date';
        date.value = value;
        cell.appendChild(date);
        if (!editable){
            date.setAttribute('disabled', true);
        }
    }else if (t === "time"){
        let time = document.createElement('input');
        time.type = 'time';
        time.value = value;
        cell.appendChild(time);
        if (!editable){
            time.setAttribute('disabled', true);
        }
    }else if (t === "image"){
        let img = document.createElement('img');
        img.src = value;
        cell.appendChild(img);
    }else if (t === "url"){
        let link = document.createElement('a');
        link.href = value;
        link.innerHTML = value;
        cell.appendChild(link);
    } else{
        cell.innerHTML = value;
    }
}



    window.detectCellType = detectCellType;
    window.setCellValue = setCellValue;

    window.celltypeimported = true;
}
