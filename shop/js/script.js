const webs = [
    { id: "Eat",  name: "Eat & Meet", url: "https://eatandmeet.sk/tyzdenne-menu", offline: "../shop/offline/EatAndMeet.html", parser: parseEat },
    { id: "Rest2", name: "Reštaurácia 2", url: "https://...", offline: "../shop/offline/rest2.html", parser: parseEat },
    { id: "Rest3", name: "Reštaurácia 3", url: "https://...", offline: "../shop/offline/rest3.html", parser: parseEat },
];

async function refresh(){
    const results = await Promise.allSettled(webs.map(fetchWeb));

    results.forEach((res, i) => {
        if(res.status != "fulfilled") console.error("restaurnat: " + webs[i].name + " failed to load; " + res.reason.message);
    })
    localStorage.setItem("LastRefresh", new Date());
    return results;
}

async function fetchWeb(web) {
    return fetch(web.offline)
    .then(res => {
        if (!res.ok) throw new Error("Could not load " + web.name + res.status);
        return res.text();
    })
    .then(htmlString => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        const menuListEat = web.parser(doc);
        localStorage.setItem("menuEat", menuListEat);
        return menuListEat;
    });
}

function parseEat(doc){
    const menus = doc.getElementById("day-1").parentElement.children;
    let menuList = [];
    let menu = [];
    for (const menuHtml of menus){
        for (const mealHtml of menuHtml.querySelectorAll(`.menu-details`)){
            let nameHtml = mealHtml.querySelector(".menu-description .desc").innerHTML;
            let desc = nameHtml.split("<span>");
            let name = desc[0].trim();
            let alergens = desc[1].substring(0, desc[1].indexOf("<")).replace(/^\D+/g, '');
            
            let typeHtml = mealHtml.querySelector(".menu-title h4").innerHTML.split(" ");
            let type;
            switch(typeHtml[0].trim()){
                case "MENU":
                case "ŠALÁT":
                case "VEGETARIÁNSKE":
                default:
                    type = 1;
                    break;
                case "POLIEVKA":
                    type = 0;
                    break;
                case "MÚČNE":
                case "SLADKÉ":
                    type = 2;
                    break;
            }   

            let priceHtml = mealHtml.querySelector(".price").innerHTML.split(" ");
            let priceStr = priceHtml[0].replace(",", ".");
            let price = parseFloat(priceStr).toFixed(2);
            
            let imgHtml = mealHtml.parentElement.querySelector(".menu-thumbnail img");
            let img = undefined;
            if (imgHtml != undefined) img = imgHtml.src;
            
            let meal = new Meal(name, alergens, type,price,img);
            menu.push(meal);
        }
        menu = [];
        menuList.push(menu);
    } 
    return menuList;
}

function Meal(name, alergens, type, price, thumbnail){
    this.name = name;
    this.alergens = alergens;
    this.type = type;
    this.price = price;
    this.thumbnail = thumbnail;
}

refresh().then(result =>{
    if (result.status !== "fulfuilled")
        console.error(result);
});