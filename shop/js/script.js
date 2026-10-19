const webs = [
    { id: "Eat",  name: "Eat & Meet", url: "http://localhost:8020/proxy/tyzdenne-menu", offline: "../shop/offline/EatAndMeet.html", parser: parseEat },
    { id: "Fei", name: "Jedáleň na Éčku", url: "http://localhost:8010/fei-menu/webkredit/Api/Ordering/Menu", offline: "../shop/offline/FeiCanteen.html", parser: parseFei },
    { id: "Fiit", name: "FiitFood", url: "http://localhost:8030/proxy/menu/#fiit-food", offline: "../shop/offline/FiitFood.html", parser: parseFiit },
];

async function refresh(){
    const results = await Promise.allSettled(webs.map(fetchWeb));

    results.forEach((res, i) => {
        if(res.status != "fulfilled") console.error("restaurnat: " + webs[i].name + " failed to load; " + res.reason.message);
    });
    localStorage.LastRefresh = new Date();
    //localStorage.setItem("LastRefresh", JSON.stringify(new Date()));
    return results;
}

async function fetchWeb(web) {  
    let requestUrl = web.url;
    if(web.id == "Fei"){
        const params = new URLSearchParams();
        const days = [
            "2026-10-18T22:00:00.000Z",
            "2026-10-19T22:00:00.000Z",
            "2026-10-20T22:00:00.000Z",
            "2026-10-21T22:00:00.000Z",
            "2026-10-22T22:00:00.000Z"
        ];
        days.forEach(day => params.append("Dates", day));
        params.append("CanteenId", "6");
        
        requestUrl = `${web.url}?${params.toString()}`;
    }

    const offline = () => fetch(web.offline).then(r => {
        if (!r.ok) throw new Error("Could not load " + web.name + " " + r.status);
        return r.text();
    });

    return fetch(requestUrl)
    .then(res => {
        if (!res.ok) {
            return offline();
        }
        return(res.message);
    })
    .catch(offline)
    .then(htmlString => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const menuList = web.parser(doc);
        localStorage.setItem("Menu" + web.id, JSON.stringify(menuList));
        return menuList;
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
            let alergens = desc[1].substring(0, desc[1].indexOf("<")).replace(/^\D+/g, '').replace(')', "");
            
            let typeHtml = mealHtml.querySelector(".menu-title h4").innerHTML.split(" ");
            let type;
            switch(typeHtml[0].trim()){
                case "MENU":
                case "ŠALÁT":
                case "VEGETARIÁNSKE":
                case "MÚČNE":
                case "SLADKÉ":
                default:
                    type = 1;
                    break;
                case "POLIEVKA":
                    type = 0;
                    break;
            }   

            let priceHtml = mealHtml.querySelector(".price").innerHTML.split(" ");
            let priceStr = priceHtml[0].replace(",", ".");
            let price = new Array(2);
            price[1] = parseFloat(priceStr).toFixed(2);
            priceHtml = mealHtml.querySelector(".price span").innerHTML.split(" ");
            priceStr = priceHtml[0].replace(",", ".");
            price[0] = parseFloat(priceStr).toFixed(2);

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

function parseFei(doc){
    let menuList = [];
    const table = doc.querySelector('table[data-v-59a167dc]');
    let menu = [];
    for (const category of table.querySelectorAll(".table-active"))
    {   
        if(category.querySelector("td").textContent.trim()[0] === 'H'){
            mealHtml = category;
            menu = [];
            let type = 0;
            while(mealHtml.nextElementSibling.querySelector("td span"))
            {
                mealHtml = mealHtml.nextElementSibling;
                let descStr = mealHtml.querySelector("td span").textContent.trim()
                let name;
                let alergens;
            
                name = descStr.split(", ")[0];
                
                let spans = mealHtml.querySelectorAll("td span");
                let alergensStr = spans[spans.length - 1].textContent;
                if(alergensStr.indexOf(":") > -1) {
                    alergens = alergensStr.split(":")[1].trim();
                }
                else alergens = "";
                alergens = alergenParser(alergens);

                name = name.replaceAll("\n", "");
                name = name.replace(/ +/g, " ").trim();

                let priceHtml = mealHtml.querySelectorAll(".text-right");
                let price= [];
                price[0] = parseFloat(priceHtml[0].textContent.trim().split(" ")[0].replace(",", ".")).toFixed(2);
                price[1] = parseFloat(priceHtml[1].textContent.trim().split(" ")[0].replace(",", ".")).toFixed(2);
                
                let meal =new Meal(name, alergens, type, price, null) 
                menu.push(meal);
                type = 1;    
            }
            menuList.push(menu);
        }
    }
    return menuList;
}

function alergenParser(alergens){
    let parts = alergens.split(", ");
    let out = "";
    parts.forEach(part => {
        switch(part){
            case "lepok":
                out = out + "1,";
                break;
            case "vajcia":
                out = out + "3,";
                break;
            case "ryby":
                out = out + "4,";
                break;
            case "sója":
                out = out + "6,";
                break;
            case "orechy":    
                out = out + "8,";
                break;
            case "mlieko":
                out = out + "7,";
                break;
            case "zeler":
                out = out + "8,";
                break;
            case "horčica":
                out = out + "10,";
                break;
            default:
                out = out + part + ",";
                break;
        }
    })
    return out.substring(0,out.length-1);
}

function parseFiit(doc){
    const days = doc.querySelectorAll("#fiit-food .daily-offer > li");
    let menuList = [];
    for(const day of days){
        let menu = [];
        for(const mealHtml of day.querySelectorAll(".day-offer li")){
            let type = 1;
            if(mealHtml.textContent.trim()[0] == 'P') type = 0;
            let priceStr = mealHtml.querySelector(".price").textContent.replace(",", ".").replace("€","");
            for (const span of mealHtml.querySelectorAll("span")) {span.textContent = "|" + span.textContent + "|";}
            let desc = mealHtml.textContent.split("|");
            let descStr = desc[2].replace("(V)", "").split("A:");
            let name = descStr[0].trim();
            let alergens = descStr[1].trim();
            let price = [];
            price[0] = null;
            price[1] = parseFloat(priceStr).toFixed(2);
            let meal = new Meal(name, alergens, type, price, null);
            menu.push(meal);
        }
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

webs.forEach(web => {
    const now = new Date();
    if (localStorage.getItem("Menu" + web.id) == undefined || new Date(localStorage.LastRefresh).getDay() < now.getDay()){
        refresh().then(results =>{
            results.forEach(result => {
                if (result.status !== "fulfilled")
                    console.error(result);
            });
        });
    }
});

