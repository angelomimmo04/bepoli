function saveToLocalStorage(item,data){
    try{
        const serializedData=JSON.stringify(data)
        localStorage.setItem(item,serializedData)
    }   catch (e) {
        console.warn(e)
    }

}

function loadFromLocalStorage(item){
    try{
        const serializedData=localStorage.getItem(item)
        if(serializedData===null)return undefined;
        return JSON.parse(serializedData)
    } catch(e){
        console.warn(e)
        return undefined
    }
}

export{saveToLocalStorage,loadFromLocalStorage}