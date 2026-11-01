const webs = [
    { id: "Eat",  name: "Eat & Meet", url: "http://localhost:8020/proxy/tyzdenne-menu", offline: "../shop/offline/EatAndMeet.html", parser: parseEat },
    { id: "Fei", name: "Jedáleň na Éčku", url: "http://localhost:8010/fei-menu/webkredit/Api/Ordering/Menu", offline: "../shop/offline/FeiCanteen.html", parser: parseFei },
    { id: "Fiit", name: "FiitFood", url: "http://localhost:8030/proxy/menu/#fiit-food", offline: "../shop/offline/FiitFood.html", parser: parseFiit },
];


const localLastRefresh = new Date("November 1, 2026, 13:00")

async function refresh(){
    const results = await Promise.allSettled(webs.map(fetchWeb));

    results.forEach((res, i) => {
        if(res.status != "fulfilled") {
            console.error("restaurnat: " + webs[i].name + " failed to load; " + res.reason.message);
        }
    });
    localStorage.setItem("LastRefresh", new Date().toISOString());
    showLastRefresh();
    showMenus();
    return results;
}

function showLastRefresh(){
    const date = new Date(localStorage.getItem("LastRefresh"));
    if (!localStorage.getItem("LastRefresh") || isNaN(date)) return;
    const time = document.querySelector("#LastRefresh");
    if (!time) return; // O projekte has no update time
    time.dateTime = date.toISOString();
    time.textContent = date.toLocaleString("sk-SK");
}

async function fetchWeb(web) {
    let localCopy = false;  
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
        localCopy = true;
        if (!r.ok) {
            throw new Error("Could not load " + web.name + " " + r.status);
        }    
        return r.text();
    });

    return fetch(requestUrl)
    .then(res => {
        if (!res.ok) {
            return offline();
        }
        return(res.text());
    })
    .catch(offline)
    .then(htmlString => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const menuList = web.parser(doc);
        localStorage.setItem("Menu" + web.id,"Local copy: " + localCopy + ":|:" + JSON.stringify(menuList));
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
            switch(typeHtml[0].trim().toUpperCase()){
                case "POLIEVKA":
                    type = 0;
                    break;
                case "MENU":
                case "ŠALÁT":
                case "VEGETARIÁNSKE":
                case "MÚČNE":
                case "SLADKÉ":
                default:
                    type = 1;
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
                out = out + "9,";
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
            price[1] = parseFloat(priceStr).toFixed(2);
            price[0] = parseFloat(priceStr).toFixed(2);
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

async function resetMenuTable(){
    const html = await fetch("index.html").then(r => r.text());
    const doc = new DOMParser().parseFromString(html, "text/html");
    document.querySelector(".menu-table").replaceWith(doc.querySelector(".menu-table"));
}

function showMenus(){
    if(document.title !== "Obedové menu v okolí fakulty") return;
    resetMenuTable().then(show => {
        webs.forEach(web => {
            const days = document.querySelectorAll("[data-type='0']")
            const menu = localStorage.getItem("Menu" + web.id);
            if(menu == undefined){
                for (const day of days){
                    let first = day.querySelector(`[data-restaurant='${web.id}']`);
                    first.classList.add("menu-empty");
                    first.innerHTML = "";
                    const span = document.createElement("span");
                    span.classList.add("menu-empty__text");
                    span.innerHTML = "V tento deň jedáleň menu nevydáva";
                    first.appendChild(span);        
                }
            }
            else{
                const menuParts = menu.split(":|:");
                const localCopy = menuParts[0].split(": ");
                if(localCopy[1] === "true") {
                    const restaurantMeta = document.querySelector(`[data-restaurant='${web.id}'] .restaurant__meta`)
                    let tag = document.createElement("span");
                    tag.classList.add("tag");
                    tag.textContent = "Lokálna kópia ";
                    let tagDate = document.createElement("time");
                    tagDate.classList.add("tag__date");
                    tagDate.setAttribute("datetime", `${localLastRefresh.getFullYear()}-${localLastRefresh.getMonth()}-${localLastRefresh.getDay()}`);
                    tagDate.textContent = `${localLastRefresh.getDate()}. ${localLastRefresh.getMonth()+1}.`;
                    tag.appendChild(tagDate);
                    restaurantMeta.appendChild(tag);
                }
                menuData = JSON.parse(menuParts[1]);
                for(let i = 0; i<5; i++){
                    menuDay = menuData[i] ? menuData[i]: [];
                    let containers =  [days[i], days[i].nextElementSibling];
                    let mealCount = [containers[0].childElementCount -1,  containers[1].childElementCount - 1];
                    for(const meal of menuDay){
                        let type = meal.type;
                        if (mealCount[type] == 0){
                            let tableRow = document.createElement("tr");
                            for(const web of webs){
                                let tableData = document.createElement("td");
                                tableData.setAttribute("data-restaurant", web.id);
                                tableRow.appendChild(tableData);
                            }
                            containers[type].appendChild(tableRow);
                            mealCount[type]++;
                        }
                        
                        let mealItem = containers[type].children.item(containers[type].childElementCount - mealCount[type]).querySelector(`[data-restaurant='${web.id}']`);
                        mealItem.classList.add("meal");
                        if(type == 0) mealItem.classList.add("meal--soup");

                        price = meal.price[0] + "&nbsp;€";
                        if(type == 0 && parseFloat(meal.price[0].replace(",", ".")) == 0.0){
                            price = "v cene menu";
                        }
                        let fullPrice = (meal.price[1] != null && type == 1) ? "plná " + meal.price[1] + "&nbsp;€": "";
                        const stringData = `
                            <div class="meal__body">
                                <p class="meal__name">${meal.name}</p>
                                <p class="meal__details"><span><abbr title="alergény">A</abbr> ${meal.alergens}</span></p>
                                <p class="meal__price">
                                    <data value="${parseFloat(meal.price[0].replace(",", "."))}">${price}</data>
                                    <small class="meal__price-alt">${fullPrice}</small>
                                </p>
                            </div>
                        `;

                        mealItem.insertAdjacentHTML("beforeend", stringData);   
                        mealCount[type] --;
                    } 
                }   
            }
        });
    });
}

showLastRefresh();
showMenus();
window.addEventListener("storage", e => {
    if (e.key == "LastRefresh") showLastRefresh();
    if (e.key == "MenuFiit" || e.key == "MenuFei"|| e.key == "MenuEat") showMenus();
});

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

