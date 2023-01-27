
//@ USING CDNS INSTEAD
const axios = require("axios");
const request = require("request");
const fs = require("fs");
var liveServer = require("live-server");
const readline = require('readline-sync');
const open = require('open');
const jsdom = require('jsdom');

var IDNum = readline.question("Enter your ID Number: ")

const initURL = `https://mdcpsportalapps2.dadeschools.net/PIVredirect/?ID=${IDNum}`
const grdSource = 'https://gradebook.dadeschools.net/Pinnacle/Gradebook/InternetViewer/GradeReport.aspx'
const postSRC = 'https://gradebook.dadeschools.net/Pinnacle/Gradebook/Link.aspx?target='

axios.get(initURL)
    .then(async response => {
        const StudentID = response.data.split("value=")[2].split(">")[0].slice(1, -1)

        console.log(`StudentID obtained: ${StudentID}`);
        return getCookies(StudentID)
    })

function getCookies(StudentID) {
    const options = {
        method: 'POST',
        url: postSRC,
        headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Access-Control-Allow-Origin': '*',
        },
        form: {
            action: 'trans',
            StudentID: StudentID
        }
    }

    return request(options, async (e, res) => {
        const cookies = res.headers['set-cookie']
            .reverse()
            .map(a => a.split(';')[0])
            .join('; ')

        console.log("Cookies obtained")

        return fetchGrades(cookies)
    })
}

const fetchGrades = async (cookies) => {
    const options = {
        method: 'GET',
        url: grdSource,
        headers: {
            'Referer': initURL,
            'Cookie': cookies,
            'Pragma': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.0.0 Safari/537.36'
        }
    }

    return request(options, async (_, r, html) => {
        console.log("InnerHTML obtained")

        const re = /style=\"background-image: url[\;\&0-9a-zA-Z\(\)\'\.\=\:\/\?/-]*/i

        html = html
            .replaceAll("/Pinnacle/", "https://gradebook.dadeschools.net/Pinnacle/")

        html = html
            .replaceAll("<body>", `<body onload="checkCookie()">`)
            .replaceAll("https://gradebook.dadeschools.net/Pinnacle/Gradebook/Styles/Main.css?v=17.6.22194.3", "Main.css")
            .replaceAll("https://gradebook.dadeschools.net/Pinnacle/Gradebook/bundles/jquery?v=1FX81UAq5AGu8la0ngX6pg_kTYRSiJ-qLlLiogj97p01", "https://kit.fontawesome.com/65a259d37d.js")
            .replaceAll("https://gradebook.dadeschools.net/Pinnacle/Gradebook/bundles/bootstrap?v=Knw3POJj974QSDYodP8y2JGkV04nFQI_mDVLOzobjUI1", "bruh.js")
            .replaceAll("../Branding/DadeHeaderLogo.png", "https://gradebook.dadeschools.net/Pinnacle/Gradebook/Branding/DadeHeaderLogo.png")
            .replaceAll("https://gradebook.dadeschools.net/Pinnacle/Gradebook/InternetViewer/GradeReport.aspx?Student=1312590", "#")
            .replace(re, `style="background-image: url('https://gradebook.dadeschools.net/Pinnacle/Gradebook/Images/NoPhoto.png')`)
            .replaceAll(`<a class="button-menu" href="#sideBar" aria-label="Menu" role="button">`, "")
            .replaceAll(`<i class="fa fa-fw fa-lg fa-bars"></i>`, "")
            .replaceAll("fa fa-lg fa-fw fa-home", "fa-solid fa-house")
            .replaceAll(`<form method="post" action="./GradeReport.aspx" id="aspnetForm" class="mainForm">`, "")
            .replaceAll(`<a class="letter-container "`, `<a class="letter-container" href="javascript:void(0);" onclick="getCourseURL(this)"`)
            .replaceAll(`class="course"`, `class="course" onclick="changeGrade(this)" style="cursor: pointer"`)
            .replaceAll(`href="StudentAssignments.aspx`, `course-data="StudentAssignments.aspx`)

        fs.writeFile("output.html", html, (e) => {
            if (e) {
                return console.log(e)
            }
            else {
                var doc = new jsdom.JSDOM(html, "text/xml")

                var name = doc.window.document.querySelector("strong").textContent

                params = {
                    host: "127.0.0.1",
                    port: 8080,
                    open: false
                }
                
                liveServer.start(params);
                
                open(`http://127.0.0.1:8080/login.html?name=${name}&id=${IDNum}`)
                
                console.log("Output saved to html file")
            }
        })
    })
}


function getCourseURL(d) {
    // courseGradeURL = `https://gradebook.dadeschools.net/Pinnacle/Gradebook/InternetViewer/${d.getAttribute("course-data")}`

    const grade = Array.prototype.slice.call(Array.prototype.slice.call(Array.prototype.slice.call(d.children)[0].children)[0].children)[0].textContent.replaceAll("\t", "").replaceAll("\n", "")
    const quarter = d.children[1].textContent
    const id = document.querySelector("small").innerHTML
    const student = document.querySelector("strong").innerHTML
    const course = getElementByXpath(getPathTo(d).split("]")[0] + "]").children[1].children[0].textContent.replaceAll("\t", "")
    const teacher = getElementByXpath(getPathTo(d).split("]")[0] + "]").children[1].children[1].textContent.split(",")[0]

    if (grade == '') {
        window.location = `/nogrades.html?quarter=${quarter}&id=${id}&student=${student}&course=${course}&teacher=${teacher}`
    }
    else {
        window.location = `/coursegrades.html?grade=${grade}&quarter=${quarter}&id=${id}&student=${student}&course=${course}&teacher=${teacher}`
    }
}

function changeGrade(d) {
    const gradeObject = {}
    const row = d.parentElement.parentElement

    let divs = Array.prototype.slice.call(row.children[2].children)

    const as = divs.map(div => Array.prototype.slice.call(div.children)).flat(1)

    divs = as.map(a => Array.prototype.slice.call(a.children))

    let lettersWithSpace = divs.map(div => Array.prototype.slice.call(Array.prototype.slice.call(div[0].children)[0].children)[0].textContent)
    let letters = lettersWithSpace.map(letter => letter.replaceAll("\t", "").replaceAll("\n", ""))

    let i = 1;

    var changingRow = document.createElement("div")
    changingRow.setAttribute("class", "changingRow")
    row.append(changingRow)

    letters.reverse().forEach(letter => {
        var input = document.createElement("input")
        input.setAttribute("class", `inputBox`)
        input.setAttribute("maxlength", "5")
        input.setAttribute("value", `${letter}`)
        changingRow.append(input)

        i += 1
    })

    var button = document.createElement("button")
    button.setAttribute("id", "changeGrade")
    button.setAttribute("type", "button")
    button.setAttribute("onclick", "submitGrade(this)")
    button.innerHTML = "Submit"
    changingRow.append(button)

}

function submitGrade(d) {
    const row = d.parentElement.parentElement
    var inputs = Array.prototype.slice.call(Array.prototype.slice.call(row.children).slice(-1)[0].children).slice(0, -1)
    let divs = Array.prototype.slice.call(row.children[2].children)
    const as = divs.map(div => Array.prototype.slice.call(div.children)).flat(1)
    divs = as.map(a => Array.prototype.slice.call(a.children))
    divs = divs.map(div => Array.prototype.slice.call(Array.prototype.slice.call(div[0].children)[0].children)[0])

    let i = 0;
    inputs.reverse().forEach(input => {
        const Alettercolor = "#007F00";
        const Abackgroundcolor = "#DAF2DA";
        const Blettercolor = "#3F7F00";
        const Bbackgroundcolor = "#E6F2DA";
        const Clettercolor = "#7F7F00";
        const Cbackgroundcolor = "#F2F2DA";
        const Dlettercolor = "#7F3F00";
        const Dbackgroundcolor = "#F2E6DA";
        const Flettercolor = "#7F0000";
        const Fbackgroundcolor = "#F2DADA";

        if (input.value[0] == "A") {
            getElementByXpath(getPathTo(divs[i])).style = `color: ${Alettercolor} !important`

            const changeBackgroundColor = divs[i].parentElement.parentElement
            getElementByXpath(getPathTo(changeBackgroundColor)).style = `background-color: ${Abackgroundcolor} !important`

            getElementByXpath(getPathTo(divs[i])).innerHTML = `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`
            setCookie(getPathTo(divs[i]), `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`, 30)
            setCookie(`color${getPathTo(divs[i])}`, `color: ${Alettercolor} !important`, 30)
            setCookie(getPathTo(changeBackgroundColor), `background-color: ${Abackgroundcolor} !important`)
        }
        else if (input.value[0] == "B") {
            getElementByXpath(getPathTo(divs[i])).style = `color: ${Blettercolor} !important`

            const changeBackgroundColor = divs[i].parentElement.parentElement
            getElementByXpath(getPathTo(changeBackgroundColor)).style = `background-color: ${Bbackgroundcolor} !important`

            getElementByXpath(getPathTo(divs[i])).innerHTML = `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`
            setCookie(getPathTo(divs[i]), `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`, 30)
            setCookie(`color${getPathTo(divs[i])}`, `color: ${Blettercolor} !important`, 30)
            setCookie(getPathTo(changeBackgroundColor), `background-color: ${Bbackgroundcolor} !important`)
        }
        else if (input.value[0] == "C") {
            getElementByXpath(getPathTo(divs[i])).style = `color: ${Clettercolor} !important`

            const changeBackgroundColor = divs[i].parentElement.parentElement
            getElementByXpath(getPathTo(changeBackgroundColor)).style = `background-color: ${Cbackgroundcolor} !important`

            getElementByXpath(getPathTo(divs[i])).innerHTML = `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`
            setCookie(getPathTo(divs[i]), `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`, 30)
            setCookie(`color${getPathTo(divs[i])}`, `color: ${Clettercolor} !important`, 30)
            setCookie(getPathTo(changeBackgroundColor), `background-color: ${Cbackgroundcolor} !important`)
        }
        else if (input.value[0] == "D") {
            getElementByXpath(getPathTo(divs[i])).style = `color: ${Dlettercolor} !important`

            const changeBackgroundColor = divs[i].parentElement.parentElement
            getElementByXpath(getPathTo(changeBackgroundColor)).style = `background-color: ${Dbackgroundcolor} !important`

            getElementByXpath(getPathTo(divs[i])).innerHTML = `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`
            setCookie(getPathTo(divs[i]), `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`, 30)
            setCookie(`color${getPathTo(divs[i])}`, `color: ${Dlettercolor} !important`, 30)
            setCookie(getPathTo(changeBackgroundColor), `background-color: ${Dbackgroundcolor} !important`)
        }
        else if (input.value[0] == "F") {
            getElementByXpath(getPathTo(divs[i])).style = `color: ${Flettercolor} !important`

            const changeBackgroundColor = divs[i].parentElement.parentElement
            getElementByXpath(getPathTo(changeBackgroundColor)).style = `background-color: ${Fbackgroundcolor} !important`

            getElementByXpath(getPathTo(divs[i])).innerHTML = `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`
            setCookie(getPathTo(divs[i]), `${input.value[0]}<span class="percent">${input.value.slice(1)}</span>`, 30)
            setCookie(`color${getPathTo(divs[i])}`, `color: ${Flettercolor} !important`, 30)
            setCookie(getPathTo(changeBackgroundColor), `background-color: ${Fbackgroundcolor} !important`)
        }
        else if (input.value == "") {
            getElementByXpath(getPathTo(divs[i])).innerHTML = `<span class="percent"></span>`

            const changeBackgroundColor = divs[i].parentElement.parentElement
            getElementByXpath(getPathTo(changeBackgroundColor)).style = `background-color: #ffffff !important;`
            setCookie(getPathTo(divs[i]), `<span class="percent"></span>`, 30)
            setCookie(getPathTo(changeBackgroundColor), `background-color: #ffffff !important;`)
        }

        i += 1;
    })

    getElementByXpath(getPathTo(d.parentElement)).style.display = "none"
}

function getPathTo(element) {
    if (element.id !== '')
        return 'id("' + element.id + '")';
    if (element === document.body)
        return element.tagName;

    var ix = 0;
    var siblings = element.parentNode.childNodes;
    for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling === element)
            return getPathTo(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
            ix++;
    }
}

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    //   console.log(`Set new cookie ${cname} with value: ${cvalue}`);
}

function getAllCookies() {
    var pairs = document.cookie.split(";");
    var cookies = {};
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=");
        cookies[(pair[0] + '').trim()] = unescape(pair.slice(1).join('='));
    }
    return cookies;
}

function checkCookie() {
    setTimeout(() => { document.querySelector("body").style.display = "block" }, 500)

    const topBar = document.querySelector(".TopBar")
    const resetCookiesBtn = document.createElement("button")
    resetCookiesBtn.setAttribute("type", "button")
    resetCookiesBtn.setAttribute("class", "resetCookiesBtn")
    resetCookiesBtn.setAttribute("onclick", "resetCookies()")
    resetCookiesBtn.innerHTML = "Reset Grades"
    topBar.append(resetCookiesBtn)

    const photo = document.querySelector(".round-person-photo")
    photo.addEventListener("click", () => {
        document.querySelector(".resetCookiesBtn").classList.toggle("makeBtnVisible")
    })

    let allCookies = getAllCookies();

    for (const key in allCookies) {
        if (key.startsWith("id") && allCookies[key].endsWith("</span>")) {
            getElementByXpath(key).innerHTML = allCookies[key]
        }

        else if (key.startsWith("id") && allCookies[key].endsWith("!important")) {
            getElementByXpath(key).style = allCookies[key]
        }

        else if (key.startsWith("color")) {
            // console.log("COLOR FOUND", key);
            // console.log(key.slice(5));
            getElementByXpath(key.slice(5)).style = allCookies[key]
        }
    }
}

function resetCookies() {
  var cookies = document.cookie.split(";");
  for (var i = 0; i <= cookies.length; i++) {
      setCookie(cookies[i], "", -1);
  }
  document.location.reload();
}


