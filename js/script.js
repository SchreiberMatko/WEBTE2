const webs = [
    {no: 0, id: "Eat",  name: "Eat & Meet", url: "http://localhost:8020/proxy/tyzdenne-menu", offline: "offline/EatAndMeet.html", parser: parseEat },
    {no: 1, id: "Fei", name: "Jedáleň na Éčku", url: "http://localhost:8010/fei-menu/webkredit/Api/Ordering/Menu", offline: "offline/FeiCanteen.html", parser: parseFei },
    {no: 2, id: "Fiit", name: "FiitFood", url: "http://localhost:8030/proxy/menu/#fiit-food", offline: "offline/FiitFood.html", parser: parseFiit },
];


const localLastRefresh = [new Date("November 1, 2026, 13:00"),//eat
                          new Date("November 1, 2026, 13:00"),//fei
                          new Date("October 26, 2026, 13:00")//fiit
]; 

// How many refresh() calls are downloading the menus (pressing "Aktualizovať menu" during the
// automatic one makes two). While any is, showMenus() leaves the loader on, so a table drawn in
// the meantime (the one from the page load) does not hide it before the new menus are in.
let refreshing = 0;

async function refresh(){
    let loader = document.querySelector(".loader")
    if(!loader) return;
    loader.removeAttribute("hidden");
    refreshing++;
    const results = await Promise.allSettled(webs.map(fetchWeb));
    refreshing--;

    results.forEach((res, i) => {
        if(res.status != "fulfilled") {
            console.error("restaurnat: " + webs[i].name + " failed to load; " + res.reason.message);
        }
    });
    localStorage.setItem("LastRefresh", new Date().toISOString());
    showMenus();
    return results;
}

function showLastRefresh(){
    const date = new Date(localStorage.getItem("LastRefresh"));
    if (!localStorage.getItem("LastRefresh") || isNaN(date)) return;
    const time = document.querySelector("#LastRefresh");
    if (!time) return;
    time.dateTime = date.toISOString();
    time.textContent = date.toLocaleString("sk-SK");
    const monday = date;
    let offset = -1;
    if (monday.getDay() == 0 || monday.getDay() == 6 || (monday.getDay() == 5 && monday.getHours() > 15)){
        offset = 1;
    }
    while(monday.getDay() != 1){
        monday.setDate(monday.getDate()+offset);
    }
    let daysHtml = document.querySelectorAll(".day__date");
    let daysTable = document.querySelectorAll(".menu-table__day-title time");
    let today = -1;
    for(let i = 0; i<5; i++){
        daysHtml[i].setAttribute("datetime", `${monday.getFullYear()}-${monday.getMonth()+1}-${monday.getDate()}`);
        daysHtml[i].textContent = `${monday.getDate()}. ${monday.getMonth()+1}.`;
        daysTable[i].setAttribute("datetime", `${monday.getFullYear()}-${monday.getMonth()+1}-${monday.getDate()}`);
        daysTable[i].textContent = `${monday.getDate()}. ${monday.getMonth()+1}.`;

        const isToday = new Date().toDateString() == monday.toDateString();
        for (const el of [daysHtml[i].parentElement, daysTable[i].parentElement]){
            if (isToday) el.setAttribute("aria-current", "date");
            else el.removeAttribute("aria-current");
        }
        if (isToday) today = i;
        monday.setDate(monday.getDate()+1);
    }
    monday.setDate(monday.getDate()-1);
    let friday = [monday.getDate(), monday.getMonth()+1];
    monday.setDate(monday.getDate()-4);

    daysHtml[5].textContent = `${monday.getDate()}. ${monday.getMonth()+1} - ${friday[0]}. ${friday[1]}.`;

    if (!document.querySelector('.day[aria-pressed="true"]')){
        const tab = daysHtml[today >= 0 ? today : 0].parentElement;
        tab.setAttribute("aria-pressed", "true");
        document.querySelector(".board").dataset.day = tab.dataset.day;
    }
    
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
        menuList.push(menu);
        menu = [];
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

// Only live menus are shown (the button in the footer, js/live-only.js; kept in localStorage)
function liveOnly(){
    return localStorage.getItem("LiveOnly") === "true";
}

async function resetMenuTable(){
    const html = await fetch("index.html").then(r => r.text());
    const doc = new DOMParser().parseFromString(html, "text/html");
    document.querySelector(".menu-table").replaceWith(doc.querySelector(".menu-table"));
}

function showMenus(){
    if(document.title !== "Obedové menu v okolí fakulty") return;
    document.querySelector(".loader").removeAttribute("hidden");
    resetMenuTable().then(show => {
        webs.forEach(web => {
            const days = document.querySelectorAll("[data-type='0']")
            const menu = localStorage.getItem("Menu" + web.id);
            // With only live menus shown (the button in the footer), a menu saved from the
            // restaurant's local copy is left out: the restaurant shows as empty
            if(menu == undefined || (liveOnly() && menu.split(":|:")[0].split(": ")[1] === "true")){
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
                    tagDate.setAttribute("datetime", `${localLastRefresh[web.no].getFullYear()}-${localLastRefresh[web.no].getMonth()+1}-${localLastRefresh[web.no].getDate()}`);
                    tagDate.textContent = `${localLastRefresh[web.no].getDate()}. ${localLastRefresh[web.no].getMonth()+1}.`;
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
    // While refresh() is still downloading, the loader stays: it calls showMenus() again when it
    // is done. The update time stays too, because a new time also ends the loading (js/motion.js).
    if (refreshing > 0) return;
    showLastRefresh();
    document.querySelector(".loader").setAttribute("hidden", "true");
    if (typeof showMenu === "function") showMenu();
    });
}

showMenus();
window.addEventListener("storage", e => {
    if (e.key == "LastRefresh") showLastRefresh();
    if (e.key == "MenuFiit" || e.key == "MenuFei"|| e.key == "MenuEat") showMenus();
    if (e.key == "LiveOnly"){
        showMenus();
        if (typeof showSourceButton === "function") showSourceButton();
    }
});

const now = new Date();
if (webs.some(web => localStorage.getItem("Menu" + web.id) == undefined) || new Date(localStorage.LastRefresh).toDateString() !== now.toDateString()){
    refresh().then(results =>{
        results.forEach(result => {
            if (result.status !== "fulfilled")
                console.error(result);
        });
    });
}

