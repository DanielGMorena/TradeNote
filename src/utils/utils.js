import { useRoute } from "vue-router";
import { pageId, timeZoneTrade, currentUser, periodRange, selectedDashTab, renderData, selectedPeriodRange, selectedPositions, selectedTimeFrame, selectedRatio, selectedAccount, selectedGrossNet, selectedPlSatisfaction, selectedBroker, selectedDateRange, selectedMonth, selectedAccounts, amountCase, screenshotsPagination, diaryUpdate, diaryButton, selectedItem, playbookUpdate, playbookButton, sideMenuMobileOut, spinnerLoadingPage, dashboardChartsMounted, dashboardIdMounted, hasData, renderingCharts, screenType, selectedRange, dailyQueryLimit, dailyPagination, endOfList, spinnerLoadMore, windowIsScrolled, legacy, selectedTags, tags, filteredTrades, idCurrent, idPrevious, idCurrentType, idCurrentNumber, idPreviousType, idPreviousNumber, screenshots, screenshotsInfos, tabGettingScreenshots, apis, layoutStyle, countdownInterval, countdownSeconds, barChartNegativeTagGroups, availableTags, groups } from "../stores/globals.js"
import { useECharts, useRenderDoubleLineChart, useRenderPieChart } from './charts.js';
import { useDeleteDiary, useGetDiaries, useUploadDiary } from "./diary.js";
import { useDeleteScreenshot, useGetScreenshots, useGetScreenshotsPagination } from '../utils/screenshots.js'
import { useDeletePlaybook } from "./playbooks.js";
import { useCalculateProfitAnalysis, useGetFilteredTrades, useGetFilteredTradesForDaily, useGroupTrades, useTotalTrades, useDeleteTrade, useDeleteExcursions } from "./trades.js";
import { useLoadCalendar } from "./calendar.js";
import { useGetAvailableTags, useGetExcursions, useGetSatisfactions, useGetTags, useGetNotes } from "./daily.js";

/* MODULES */
import Parse from 'parse/dist/parse.min.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
dayjs.extend(utc)
import isoWeek from 'dayjs/plugin/isoWeek.js'
dayjs.extend(isoWeek)
import timezone from 'dayjs/plugin/timezone.js'
dayjs.extend(timezone)
import duration from 'dayjs/plugin/duration.js'
dayjs.extend(duration)
import updateLocale from 'dayjs/plugin/updateLocale.js'
dayjs.extend(updateLocale)
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
dayjs.extend(localizedFormat)
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
dayjs.extend(customParseFormat)
import axios from 'axios'
import Shepherd from 'shepherd.js'

/**************************************
* INITS
**************************************/

export function useInitTab(param) {
    console.log("\nINIT TAB for " + param)

    let hideCurrentTab = false
    let htmlIdCurrent
    let htmlIdPrevious
    let firstTimeClick
    idCurrent.value = undefined // we set (back) to undefined because when click on modal on daily, we hide the tabs so we need to reinitiate them
    idPrevious.value = undefined

    var triggerTabList = [].slice.call(document.querySelectorAll('#nav-tab button'))
    //console.log("trigger tab list "+triggerTabList)
    var self = // is.value needed or else could not call function inside eventlistener


        triggerTabList.forEach((triggerEl) => {
            //console.log("triggerEl "+triggerEl.getAttribute('id'))
            /*var tabTrigger = new bootstrap.Tab(triggerEl)
            triggerEl.addEventListener('click', function(event) {
                console.log("clicking")
                //event.preventDefault()
                //tabTrigger.show()
            })*/
            if (param == "dashboard") {
                // GET TAB ID THAT IS CLICKED
                //console.log(" -> triggerTabList Dashboard")
                triggerEl.addEventListener('shown.bs.tab', async (event) => {
                    //console.log("target " + event.target.getAttribute('id')) // newly activated tab
                    selectedDashTab.value = event.target.getAttribute('id')
                    console.log("selected tab " + selectedDashTab.value)
                    localStorage.setItem('selectedDashTab', event.target.getAttribute('id'))
                    await (renderData.value += 1)
                    await useECharts("init")
                    //console.log("related" + event.relatedTarget) // previous active tab
                })
            }

            if (param == "daily") {
                // GET TAB ID THAT IS CLICKED

                //console.log(" -> triggerTabList Daily")
                let idClicked
                triggerEl.addEventListener('click', async (event) => {
                    /*if (idClicked == event.target.getAttribute('id')) {
                        console.log(" already clicked")
                    } else {
                        console.log(" first time clicked")
                        idClicked = event.target.getAttribute('id')
                    }
                    console.log(" -> Click on " + event.target.getAttribute('id'))
                    */
                    if (idCurrent.value != undefined) idPrevious.value = idCurrent.value // in case it's not on page load and we already are clicking on tabs, then inform that the previsous clicked tab (wich is for the moment current) should now become previous

                    idCurrent.value = event.target.getAttribute('id')


                    if (idPrevious.value == undefined) {
                        firstTimeClick = true
                        idPrevious.value = idCurrent.value //on page load, first time we click
                        hideCurrentTab = !hideCurrentTab // is.value counter intuitive but because further down we toggle hidCurrentTab, i need to toggle here if its first time click on load or else down there it would be hide true the first time. So here we set true so that further down, on first time click on page load it becomes false

                    }

                    //console.log(" -> id Current: " + idCurrent.value + " and previous: " + idPrevious.value)

                    idCurrentType.value = idCurrent.value.split('-')[0]
                    idCurrentNumber.value = idCurrent.value.split('-')[1]
                    idPreviousType.value = idPrevious.value.split('-')[0]
                    idPreviousNumber.value = idPrevious.value.split('-')[1]
                    htmlIdCurrent = "#" + idCurrentType.value + "Nav-" + idCurrentNumber.value
                    htmlIdPrevious = "#" + idPreviousType.value + "Nav-" + idPreviousNumber.value

                    //console.log(" -> Daily tab click on "+idCurrentType.value + " - index "+idCurrentNumber.value)
                    //console.log(" -> filtered trades "+JSON.stringify(filteredTrades[idCurrentNumber.value]))

                    if (idCurrentType.value === "screenshots") {
                        let screenshotsDate = filteredTrades[idCurrentNumber.value].dateUnix
                        //console.log(" -> Clicked on screenshots tab in Daily so getting screensots for "+screenshotsDate)
                        //console.log(" screenshots infos " + JSON.stringify(screenshotsInfos))
                        let index = screenshotsInfos.findIndex(obj => obj.dateUnixDay == screenshotsDate)
                        //console.log(" index " + index)
                        if (index != -1) {

                            if (screenshots.length == 0 || (screenshots.length > 0 && screenshots[0].dateUnixDay != screenshotsDate)) {
                                console.log("  --> getting Screenshots")
                                await (tabGettingScreenshots.value = true)
                                await useGetScreenshots(true, screenshotsDate)
                                await (tabGettingScreenshots.value = false)
                            } else {
                                console.log("  --> Screenshots already stored")
                            }
                        } else {
                            console.log("  --> No screenshots")
                        }
                        //console.log(" screenshots "+JSON.stringify(screenshots[0]))
                    }

                    if (idCurrent.value == idPrevious.value) {
                        hideCurrentTab = !hideCurrentTab;

                        if (hideCurrentTab) { // hide content
                            document.querySelector(htmlIdCurrent).classList.remove('show');
                            document.querySelector(htmlIdCurrent).classList.remove('active');
                            document.getElementById(idCurrent.value).classList.remove('active');
                        } else { // show content
                            document.querySelector(htmlIdCurrent).classList.add('show');
                            document.querySelector(htmlIdCurrent).classList.add('active');
                            document.getElementById(idCurrent.value).classList.add('active');
                        }
                    } else {
                        hideCurrentTab = false;

                        // In case of a different tab click, reset the previous tab
                        document.querySelector(htmlIdPrevious).classList.remove('show');
                        document.querySelector(htmlIdPrevious).classList.remove('active');
                        document.getElementById(idPrevious.value).classList.remove('active');
                    }

                })
            }
        })


}

export function useInitParse() {
    return new Promise(async (resolve, reject) => {
        console.log("\nINITIATING PARSE")
        let path = window.location.pathname
        let parse_app_id = localStorage.getItem('parse_app_id') ? localStorage.getItem('parse_app_id') : "";
        let parse_url = "/parse"
        //console.log(" -> Parse id " + parse_app_id)

        Parse.initialize(parse_app_id)
        Parse.serverURL = parse_url

        if ((parse_app_id == "") && path != "/" && path != "/register") window.location.replace("/")
        if (parse_app_id != "") await useCheckCurrentUser()
        resolve()
    })
}

export function useCheckCurrentUser() {
    console.log("\nCHECKING CURRENT USER")
    return new Promise((resolve, reject) => {
        var path = window.location.pathname
        useGetCurrentUser()
        //console.log(" -> parse user " + JSON.parse(JSON.stringify(Parse.User.current())))
        //console.log(" -> Current user " + JSON.stringify(currentUser.value))
        if (path != "/" && path != "/register") {
            if (currentUser.value) {
                //console.log("Your are logged in " + JSON.stringify(currentUser.value) + " and id " + Parse.User.current().id)
            } else {
                window.location.replace("/");
            }
        }
        if (path == "/" || path == "/register") {
            if (currentUser.value) {
                window.location.replace("/dashboard");
            } else {
                console.log("Your are not logged")
            }
        }
        resolve()
    })

}

export const useGetCurrentUser = () => {
    currentUser.value = JSON.parse(JSON.stringify(Parse.User.current()))
    //console.log("currentUser " + JSON.stringify(currentUser.value))
}

export function useGetTimeZone() {
    //console.log("Getting timezone")
    timeZoneTrade.value = currentUser.value.hasOwnProperty("timeZone") ? currentUser.value.timeZone : 'America/New_York'
    console.log(" -> TimeZone for Trades: " + timeZoneTrade.value)
}

export async function useGetPeriods() {
    //console.log(" -> Getting periods")
    return new Promise((resolve, reject) => {
        let temp = [{
            value: "all",
            label: "All",
            start: 0,
            end: 0
        }, {
            value: "thisWeek",
            label: "This Week",
            start: Number(dayjs().tz(timeZoneTrade.value).startOf('week').add(1, 'day').unix()), // we need to transform as number because later it's stringified and this becomes date format and note unix format
            end: Number(dayjs().tz(timeZoneTrade.value).endOf('week').add(1, 'day').unix())
        }, {
            value: "lastWeek",
            label: "Last Week",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'week').startOf('week').add(1, 'day').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'week').endOf('week').add(1, 'day').unix())
        }, {
            value: "lastWeekTilNow",
            label: "Last Week Until Now",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'week').startOf('week').add(1, 'day').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).endOf('week').add(1, 'day').unix())
        }, {
            value: "lastTwoWeeks",
            label: "Last Two Weeks",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(2, 'week').startOf('week').add(1, 'day').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'week').endOf('week').add(1, 'day').unix())
        }, {
            value: "lastTwoWeeksTilNow",
            label: "Last Two Weeks Until Now",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(2, 'week').startOf('week').add(1, 'day').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).endOf('week').add(1, 'day').unix())
        }, {
            value: "thisMonth",
            label: "This Month",
            start: Number(dayjs().tz(timeZoneTrade.value).startOf('month').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).endOf('month').unix())
        }, {
            value: "lastMonth",
            label: "Last Month",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'month').startOf('month').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'month').endOf('month').unix())
        }, {
            value: "lastMonthTilNow",
            label: "Last Month Until Now",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'month').startOf('month').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).endOf('month').unix())
        }, {
            value: "lastTwoMonths",
            label: "Last Two Months",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(2, 'month').startOf('month').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'month').endOf('month').unix())
        }, {
            value: "lastTwoMonthsTilNow",
            label: "Last Two Months Until Now",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(2, 'month').startOf('month').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).endOf('month').unix())
        }, {
            value: "lastThreeMonths",
            label: "Last Three Months",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(3, 'month').startOf('month').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'month').endOf('month').unix())
        }, {
            value: "lastThreeMonthsTilNow",
            label: "Last Three Months Until Now",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(3, 'month').startOf('month').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).endOf('month').unix())
        }, {
            value: "thisYear",
            label: "This Year",
            start: Number(dayjs().tz(timeZoneTrade.value).startOf('year').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).endOf('year').unix())
        }, {
            value: "lastYear",

            label: "Last Year",
            start: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'year').startOf('year').unix()),
            end: Number(dayjs().tz(timeZoneTrade.value).subtract(1, 'year').endOf('year').unix())
        }, {
            value: "custom",
            label: "Custom",
            start: -1,
            end: -1
        }]
        periodRange.length = 0
        temp.forEach(element => {
            periodRange.push(element)
        });
        resolve()
    });
}

export function useInitShepherd() {
    const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
            classes: 'tour-guide',
            scrollTo: false,
            useModalOverlay: true,
        }
    });
    if (pageId.value != "dashboard") {
        alert("Please go to the dashboard page and launch the tutorial.")
        return
    }
    tour.addSteps([{
        id: 'step1',
        text: 'Welcome onboard. This guided tutorial will show you how TradeNote works.',
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Next',
            action: tour.next
        }]
    }, {
        id: 'step2',
        text: "In the side menu, you can navigate all TradeNote pages.",
        attachTo: {
            element: '#step2',
            on: 'right-start'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        },
        {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ],
        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 15] } }]
        }
    },
    {
        id: 'step3',
        text: 'The dashboard shows all your main metrics.',
        attachTo: {
            element: '#step3',
            on: 'right'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ]
    },
    {
        id: 'step4',
        text: '<p>Daily shows a detailed view of trades per day.</p><p>For each day, there is a 4 tabs for a given day:<ul><li>Trades: list of your trades</li><li>Blotter: your trades grouped by symbol</li><li>Screenshots: your annotated screenshots</li><li>Diary: your diary entries</li></ul></p><p>In the trades tab you can click on the table row to add additional information (note, tags, etc.).</p>',
        attachTo: {
            element: '#step4',
            on: 'right'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ]
    },
    {
        id: 'step5',
        text: 'Calendar displays a calendar view of your daily trades.',
        attachTo: {
            element: '#step5',
            on: 'right'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ]
    },

    {
        id: 'step6',
        text: 'Diary is where you can see and edit your diary entries.',
        attachTo: {
            element: '#step6',
            on: 'right'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ],
        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 15] } }]
        }
    },
    {
        id: 'step7',
        text: 'Screenshots is where you can see all your screenshots.',
        attachTo: {
            element: '#step7',
            on: 'right'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ]
    },
    {
        id: 'step8',
        text: 'Playbook is where you can see and edit your (yearly) playbook.',
        attachTo: {
            element: '#step8',
            on: 'right'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ]
    },
    {
        id: 'step10',
        text: "<p>You can filter your trades per date, account, gross vs net (excluding or including fees and commissions) and position (long and/or short).</p><p>You can also decide to aggregate data per day, week or year.</p><p>On certain graphs, you can decide to see data as Average Profit Per Trade (APPT), Average Profit Per Security (APPS) or as profit factor.</p><p><b>In order to see you trades, please make sure you have chosen the right date range and that you have chosen at least one account and position type.</b></p>",
        attachTo: {
            element: '#step10',
            on: 'bottom'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ],
        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 15] } }]
        }
    },
    {
        id: 'step11',
        text: "<p>Click here to add trades, diary entries, screenshots or playbooks.</p><ul><li>Trades is used for importing trades from your Broker's csv or excel file.</li><li>Diary is where you can write your daily thoughts and progress.</li><li>Screenshots is where you can add the screenshots of your charts. You can annotate the screenshot with drawings, notes and more. You can add 2 types of screenshots:<ul><li>General Setup: a general interesting screenshot, not related to any particular trade (you made).</li><li>Trade Entry: screenshot related to a particular trade you made, in which case you need to add the exact entry time of your execution to match your trade.</li></ul></li><li>Playbook is where you can write your (yearly) trading playbook.</li></ul>",
        attachTo: {
            element: '#step11',
            on: 'bottom'
        },
        buttons: [{
            text: 'Exit',
            action: tour.complete,
            classes: 'exitButton'
        }, {
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ],
        popperOptions: {
            modifiers: [{ name: 'offset', options: { offset: [0, 15] } }]
        }
    },
    {
        id: 'step12',
        text: "In the sub-menu you can navigate to your settings, where you can amongst other add a profile picture, add API Keys and edit your tags. You can also see the version you are using as well as come back to this tutorial at any time as well as logout of your account (recommended when you update TradeNote version).",
        attachTo: {
            element: '#step12',
            on: 'bottom'
        },
        buttons: [{
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Next',
            action: tour.next
        }
        ]
    },
    {
        id: 'step13',
        text: "That's it. You are now ready to use TradeNote. You can come back to this tutorial at any time by clicking 'Tutorial' in the sub-menu.",
        buttons: [{
            text: 'Back',
            action: tour.back
        },
        {
            text: 'Done',
            action: tour.complete
        }]
    },

    ])

    tour.start();

    Shepherd.on("complete", async () => {
        console.log("Tour complete")
        const parseObject = Parse.Object.extend("User");
        const query = new Parse.Query(parseObject);
        query.equalTo("objectId", currentUser.value.objectId);
        const results = await query.first();
        if (results) {
            await results.set("guidedTour", true)
            results.save().then(() => {
                console.log(" -> Updated user")
            })
        } else {
            console.log("  --> Could not find user. is.value a problem")
        }

    })

}

export async function useInitQuill(param) {
    return new Promise((resolve, reject) => {
        //console.log("param " + param)
        let quillEditor
        if (param != undefined) {
            quillEditor = '#quillEditor' + param
        } else {
            quillEditor = '#quillEditor'
        }
        //console.log("quilEditor " + quillEditor)
        let quill = new Quill(quillEditor, {
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                    ['image'],
                ]
            },
            theme: 'snow'
        });
        quill.root.setAttribute('spellcheck', true)
        //console.log("quill " + quill)

        quill.on('text-change', () => {
            if (pageId.value == "addScreenshot") {
                setupUpdate.value.checkList = document.querySelector(".ql-editor").innerHTML
                //console.log("setup " + JSON.stringify(setupUpdate.value))
            }

            if (pageId.value == "addDiary") {
                diaryUpdate.diary = document.querySelector(".ql-editor").innerHTML
                diaryButton.value = true

                clearTimeout(countdownInterval.value);
                countdownSeconds.value = 5; // reset countdown
                countdownInterval.value = setInterval(function () {
                    //console.log(`Countdown: ${countdownSeconds.value}`);
                    countdownSeconds.value--;
                    if (countdownSeconds.value === 0) {
                        clearTimeout(countdownInterval.value);
                        useUploadDiary("autoSave")
                    }
                }, 1000); // 1 second interval
            }

            if (pageId.value == "addPlaybook") {
                playbookUpdate.playbook = document.querySelector(".ql-editor").innerHTML
                playbookButton.value = true
            }
        });
        resolve()
    })
}


export function useInitPopover() {
    console.log(" -> Init Popover");

    var popoverTriggerList

    const getTriggerList = () => {
        popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
        popoverTriggerList.forEach(function (popoverTriggerEl) {

            new bootstrap.Popover(popoverTriggerEl);
        });
    }

    getTriggerList()

    var popDel;

    document.addEventListener('click', async function (e) {
        if (e.target.classList.contains('popoverDelete')) {
            popDel = e.target;
            document.querySelectorAll('.popoverDelete').forEach(function (popDelete) {
                if (popDelete !== popDel) {
                    const popoverInstance = bootstrap.Popover.getInstance(popDelete);
                    if (popoverInstance) {
                        popoverInstance.hide();
                    }
                }
            });
        }

        if (e.target.classList.contains('popoverYes')) {
            document.querySelectorAll('.popoverDelete').forEach(function (popDelete) {
                if (popDelete === popDel) {
                    bootstrap.Popover.getInstance(popDelete).hide();
                }
            });
            if (pageId.value == "notes") {
                deleteNote.value();
            }
            if (pageId.value == "screenshots" || pageId.value == "daily") {
                useDeleteScreenshot();
            }
            if (pageId.value == "diary") {
                useDeleteDiary(true);
            }
            if (pageId.value == "playbook") {
                useDeletePlaybook();
            }

            if (pageId.value === "imports") {
                await useDeleteTrade()
                await useDeleteExcursions()
            }
        }

        if (e.target.classList.contains('popoverNo')) {
            document.querySelectorAll('.popoverDelete').forEach(function (popDelete) {
                if (popDelete === popDel) {
                    //console.log(" popDelete " + popDelete.classList)
                    //console.log(" popDel " + popDel.classList)
                    bootstrap.Popover.getInstance(popDelete).hide();
                }
            });
            selectedItem.value = null;
        }
    });
}

export function useInitTooltip() {
    //console.log(" -> Init Tooltip")
    let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map((tooltipTriggerEl) => {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })

}

export async function useInitPostHog() {
    return new Promise((resolve, reject) => {
        axios.post('/api/posthog')
            .then((response) => {
                //console.log(response);
                if (response.data != "off") {
                    ! function (t, e) {
                        var o,
                            n,
                            p,
                            r;
                        e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) {
                            function g(t, e) {
                                var o = e.split(".");
                                2 == o.length && (t = t[o[0]], e = o[1]),
                                    t[e] = function () {
                                        t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
                                    }
                            } (p = t.createElement("script")).type = "text/javascript",
                                p.async = !0,
                                p.src = s.api_host + "/static/array.js",
                                (r = t.getElementsByTagName("script")[0])
                                    .parentNode
                                    .insertBefore(p, r);
                            var u = e;
                            for (
                                void 0 !== a ?
                                    u = e[a] = [] :
                                    a = "posthog",
                                u.people = u.people || [],
                                u.toString = function (t) {
                                    var e = "posthog";
                                    return "posthog" !== a && (e += "." + a),
                                        t || (e += " (stub)"),
                                        e
                                },
                                u.people.toString = function () {
                                    return u.toString(1) + ".people (stub)"
                                },
                                o = "capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags".split(" "),
                                n = 0; n < o.length; n++)
                                g(u, o[n]);
                            e
                                ._i
                                .push([i, s, a])
                        }, e.__SV = 1)
                    }(document, window.posthog || []);
                    posthog.init(response.data, { api_host: 'https://eu.posthog.com' })
                } else {
                    console.log(" -> Analytics Off")
                }
                resolve()
            })
            .catch((error) => {
                console.log(" -> Error PostHog id " + error)
                reject(error)
            });
    })
}

/**************************************
* MOUNT 
**************************************/
export async function useMountDashboard() {
    console.log("\MOUNTING DASHBOARD")
    await console.time("  --> Duration mount dashboard");
    spinnerLoadingPage.value = true
    dashboardChartsMounted.value = false
    dashboardIdMounted.value = false
    barChartNegativeTagGroups.value = []
    await useGetSelectedRange()
    await Promise.all([useGetExcursions(), useGetSatisfactions(), useGetTags(), useGetAvailableTags()])
    await Promise.all([useGetFilteredTrades()])
    await useTotalTrades()
    await useGroupTrades()
    await useCalculateProfitAnalysis()
    await (spinnerLoadingPage.value = false)
    await (dashboardIdMounted.value = true)
    useInitTab("dashboard")
    useInitTooltip()
    await availableTags.forEach(element => {
        let index = Object.keys(groups).indexOf(element.id);
        if (index != -1) {
            let temp = {}
            temp.id = element.id
            temp.name = element.name
            barChartNegativeTagGroups.value.push(temp)
        }
    });
    await console.timeEnd("  --> Duration mount dashboard");
    if (hasData.value) {
        console.log("\nBUILDING CHARTS")
        await (dashboardChartsMounted.value = true)
        await (renderData.value += 1)
        await useECharts("init")
    }
}

export async function useMountDaily() {
    console.log("\MOUNTING DAILY")
    await console.time("  --> Duration mount daily");
    dailyPagination.value = 0
    dailyQueryLimit.value = 3
    endOfList.value = false
    spinnerLoadingPage.value = true
    await useGetSelectedRange()
    await Promise.all([useGetExcursions(), useGetSatisfactions(), useGetTags(), useGetAvailableTags(), useGetNotes(), useGetAPIS()])
    await useGetFilteredTrades()
    spinnerLoadingPage.value = false
    await console.timeEnd("  --> Duration mount daily")
    useInitTab("daily")
    useRenderDoubleLineChart()
    useRenderPieChart()
    useLoadCalendar()
    useGetDiaries(false)
    useGetScreenshots(true)
    useInitPopover()
    await (renderingCharts.value = false)

    //useInitPopover()


}

export async function useMountCalendar(param) {
    console.log("\MOUNTING CALENDAR")
    await console.time("  --> Duration mount calendar");
    await (spinnerLoadingPage.value = true)
    await useGetSelectedRange()
    await useGetFilteredTrades()
    await useLoadCalendar() // if param (true), then its coming from next or filter so we need to get filteredTrades (again)
    await (spinnerLoadingPage.value = false)
    await console.timeEnd("  --> Duration mount calendar")
}

export async function useMountScreenshots() {
    await (spinnerLoadingPage.value = true)
    console.log("\MOUNTING SCREENSHOTS")
    await console.time("  --> Duration mount screenshots");
    useGetScreenshotsPagination()
    await useGetSelectedRange()
    await Promise.all([useGetTags(), useGetAvailableTags()])
    await useGetScreenshots(false)
    await console.timeEnd("  --> Duration mount screenshots")
    useInitPopover()
}

export function useCheckVisibleScreen() {
    let visibleScreen = (window.innerHeight) // adding 200 so that loads before getting to bottom
    let documentHeight = document.documentElement.scrollHeight
    //console.log("visible screen " + visibleScreen)
    //console.log("documentHeight " + documentHeight)
    if (visibleScreen >= documentHeight) {
        useLoadMore()
    }
}

export async function useLoadMore() {
    console.log("  --> Loading more")
    spinnerLoadMore.value = true

    if (pageId.value == "daily") {
        await useGetFilteredTradesForDaily()
        await Promise.all([useRenderDoubleLineChart(), useRenderPieChart()])
        await useInitTab("daily")
        //await useGetDiaries(true)
        //await (renderingCharts.value = false)
    }

    if (pageId.value == "screenshots") {
        await useGetScreenshots(false)
    }

    if (pageId.value == "diary") {
        await useGetDiaries(true)
        await useGetSatisfactions()
    }

    spinnerLoadMore.value = false

}

export function useCheckIfWindowIsScrolled() {
    window.addEventListener('scroll', () => {
        windowIsScrolled.value = window.scrollY > 100;
    });
}

/**************************************
* MISC
**************************************/
export function usePageId() {
    const route = useRoute()
    pageId.value = route.name
    console.log("\n======== " + pageId.value.charAt(0).toUpperCase() + pageId.value.slice(1) + " Page/View ========\n")
    return pageId.value
}

export function useGetSelectedRange() {
    return new Promise(async (resolve, reject) => {
        if (pageId.value == "dashboard") {
            selectedRange.value = selectedDateRange.value
        } else if (pageId.value == "calendar") {
            selectedRange.value = {}
            selectedRange.value.start = dayjs.unix(selectedMonth.value.start).tz(timeZoneTrade.value).startOf('year').unix()
            selectedRange.value.end = selectedMonth.value.end
            //console.log("SelectedRange "+JSON.stringify(selectedRange.value))
        }
        else {
            selectedRange.value = selectedMonth.value
        }
        //console.log("SelectedRange "+JSON.stringify(selectedRange.value))
        resolve()
    })
}

export function useScreenType() {
    let screenWidth = (window.innerWidth > 0) ? window.innerWidth : screen.width
    screenType.value = (screenWidth >= 992) ? 'computer' : 'mobile'
}

export async function useSetValues() {
    return new Promise(async (resolve, reject) => {
        console.log(" -> Setting selected local storage")
        //console.log("Period Range "+JSON.stringify(periodRange))
        //console.log("now "+dayjs().tz(timeZoneTrade.value).startOf('month').unix())
        if (!localStorage.getItem('selectedDashTab')) localStorage.setItem('selectedDashTab', 'overviewTab')
        selectedDashTab.value = localStorage.getItem('selectedDashTab')

        if (Object.is(localStorage.getItem('selectedPositions'), null)) localStorage.setItem('selectedPositions', ["long", "short"])
        selectedPositions.value = localStorage.getItem('selectedPositions').split(",")

        if (!localStorage.getItem('selectedTimeFrame')) localStorage.setItem('selectedTimeFrame', "daily")
        selectedTimeFrame.value = localStorage.getItem('selectedTimeFrame')

        if (!localStorage.getItem('selectedRatio')) localStorage.setItem('selectedRatio', "appt")
        selectedRatio.value = localStorage.getItem('selectedRatio')

        if (!localStorage.getItem('selectedAccount')) localStorage.setItem('selectedAccount', "all")
        selectedAccount.value = localStorage.getItem('selectedAccount')

        if (!localStorage.getItem('selectedGrossNet')) localStorage.setItem('selectedGrossNet', "gross")
        selectedGrossNet.value = localStorage.getItem('selectedGrossNet')

        if (!localStorage.getItem('selectedPlSatisfaction')) localStorage.setItem('selectedPlSatisfaction', "pl")
        selectedPlSatisfaction.value = localStorage.getItem('selectedPlSatisfaction')

        if (!localStorage.getItem('selectedBroker')) localStorage.setItem('selectedBroker', "tradeZero")
        selectedBroker.value = localStorage.getItem('selectedBroker')

        if (!localStorage.getItem('selectedDateRange')) localStorage.setItem('selectedDateRange', JSON.stringify({ start: periodRange.filter(element => element.value == 'thisMonth')[0].start, end: periodRange.filter(element => element.value == 'thisMonth')[0].end }))
        selectedDateRange.value = JSON.parse(localStorage.getItem('selectedDateRange'))

        if (!localStorage.getItem('selectedPeriodRange')) {
            let tempFilter = periodRange.filter(element => element.start == selectedDateRange.value.start && element.end == selectedDateRange.value.end)
            //console.log("selectedDateRange.value "+JSON.stringify(selectedDateRange.value))
            //console.log("tempFilter  "+tempFilter)
            if (tempFilter.length > 0) {
                localStorage.setItem('selectedPeriodRange', JSON.stringify(tempFilter[0]))
            } else {
                console.log(" -> Custom range in vue")
                localStorage.setItem('selectedPeriodRange', JSON.stringify(periodRange.filter(element => element.start == -1)[0]))
            }
        }
        selectedPeriodRange.value = JSON.parse(localStorage.getItem('selectedPeriodRange'))

        if (!localStorage.getItem('selectedMonth')) localStorage.setItem('selectedMonth', JSON.stringify({ start: periodRange.filter(element => element.value == 'thisMonth')[0].start, end: periodRange.filter(element => element.value == 'thisMonth')[0].end }))
        selectedMonth.value = JSON.parse(localStorage.getItem('selectedMonth'))

        if (Object.is(localStorage.getItem('selectedAccounts'), null) && currentUser.value && currentUser.value.hasOwnProperty("accounts") && currentUser.value.accounts.length > 0) {
            currentUser.value.accounts.forEach(element => {
                selectedAccounts.value.push(element.value)
            });
            //console.log("selected accounts " + JSON.stringify(selectedAccounts))
            localStorage.setItem('selectedAccounts', selectedAccounts.value)
            selectedAccounts.value = localStorage.getItem('selectedAccounts').split(",")
        }

        let selectedTagsNull = Object.is(localStorage.getItem('selectedTags'), null)
        console.log("selectedTagsNull " + selectedTagsNull)
        if (selectedTagsNull) {
            await useGetTags()
            if (selectedTagsNull) {
                console.log("selected tags is null ")
                selectedTags.value.push("t000t")

                tags.length = 0 // I'm already reseting in useGetPatterns but for some reason it would not be fast enough for this case
                localStorage.setItem('selectedTags', selectedTags.value)
                console.log("selectedTags " + JSON.stringify(selectedTags.value))
            }

        }


        amountCase.value = localStorage.getItem('selectedGrossNet')
        //console.log('amount case '+amountCase.value)
        resolve()
    })
}

export function useEditItem(param) {
    sessionStorage.setItem('editItemId', param);
    if (pageId.value == "daily" || pageId.value == "diary") {
        window.location.href = "/addDiary"
    }
    if (pageId.value == "entries") {
        window.location.href = "/addEntry"
    }
    if (pageId.value == "screenshots") {
        sessionStorage.setItem('screenshotsPagination', screenshotsPagination.value);
        sessionStorage.setItem('screenshotIdToEdit', param) //We use this to scroll to watched id on screenshots page. We e rase it in scrollToScreenshot

        window.location.href = "/addScreenshot"
    }
    if (pageId.value == "playbook") {
        window.location.href = "/addPlaybook"
    }
}

export function usePageRedirect(param) {
    if (param) {
        window.location.href = "/" + param
    }
    if (pageId.value == "daily") {
        window.location.href = "/daily"
    }
    if (pageId.value == "addDiary") {
        window.location.href = "/diary"
    }
    if (pageId.value == "addPlaybook") {
        window.location.href = "/playbook"
    }

}

export function useToggleMobileMenu() {
    let element = document.getElementById("sideMenu");
    element.classList.toggle("toggleSideMenu");
    sideMenuMobileOut.value = !sideMenuMobileOut.value
    console.log("sideMenuMobileOut " + sideMenuMobileOut.value)
}

export function useCapitalizeFirstLetter(param) {
    return param.charAt(0).toUpperCase() + param.slice(1)
}

export function returnToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


export const useGetLegacy = async () => {
    console.log(" -> Getting legacy information")
    return new Promise(async (resolve, reject) => {
        const parseObject = Parse.Object.extend("_User");
        const query = new Parse.Query(parseObject);
        query.equalTo("objectId", currentUser.value.objectId);
        const results = await query.first();
        if (results) {
            let parsedResults = JSON.parse(JSON.stringify(results))
            let currentLegacy = parsedResults.legacy
            //console.log(" currentLegacy " + JSON.stringify(currentLegacy))
            if (currentLegacy != undefined && currentLegacy.length > 0) {
                for (let index = 0; index < currentLegacy.length; index++) {
                    const element = currentLegacy[index];
                    legacy.push(element)
                }

            }
            console.log("  --> Legacy " + JSON.stringify(legacy))
            resolve()
        } else {
            console.log(" -> NO USER !!!")
            reject()
        }
    })
}

export const useUpdateLegacy = async (param1) => {
    console.log("\n -> Updating legacy information")
    return new Promise(async (resolve, reject) => {
        const parseObject = Parse.Object.extend("_User");
        const query = new Parse.Query(parseObject);
        query.equalTo("objectId", currentUser.value.objectId);
        const results = await query.first();
        if (results) {
            let parsedResults = JSON.parse(JSON.stringify(results))
            let currentLegacy = parsedResults.legacy
            const saveLegacy = () => {
                console.log("  --> Saving legacy")
                let temp = {}
                temp.name = param1
                temp.updated = true
                currentLegacy.push(temp)
            }

            if (currentLegacy == undefined) {
                currentLegacy = []
                saveLegacy()

            } else if (currentLegacy.length == 0) {
                currentLegacy = []
                saveLegacy()
            }
            else {
                console.log("  --> Updating legacy")
                let index = currentLegacy.findIndex(obj => obj.name == param1)
                if (index == -1) {
                    saveLegacy()
                } else {
                    currentLegacy[index].updated = true
                }

            }

            results.set("legacy", currentLegacy)
            results.save()
                .then(async () => {
                    console.log(' -> Saved/Updated legacy with id ' + results.id)
                    resolve()
                }, (error) => {
                    console.log('Failed to save/update legacy, with error code: ' + error.message);
                    reject()
                })

        } else {
            console.log(" -> NO USER !!!")
            reject()
        }
    })
}

export const useGetAPIS = async () => {
    console.log("\n -> Getting APIS")
    apis.length = 0
    return new Promise(async (resolve, reject) => {
        const parseObject = Parse.Object.extend("_User");
        const query = new Parse.Query(parseObject);
        const results = await query.first();
        if (results) {
            let parsedResults = JSON.parse(JSON.stringify(results))

            if (parsedResults.apis != undefined) {
                for (let index = 0; index < parsedResults.apis.length; index++) {
                    const element = parsedResults.apis[index];
                    apis.push(element)
                }
            }

            resolve()

        } else {
            console.log(" -> NO USER !!!")
            reject()
        }
    })
}

export const useGetLayoutStyle = async () => {
    console.log("\n -> Getting Layout Style")
    layoutStyle.length = 0
    return new Promise(async (resolve, reject) => {
        const parseObject = Parse.Object.extend("_User");
        const query = new Parse.Query(parseObject);
        const results = await query.first();
        if (results) {
            let parsedResults = JSON.parse(JSON.stringify(results))

            if (parsedResults.layoutStyle != undefined) {
                for (let index = 0; index < parsedResults.layoutStyle.length; index++) {
                    const element = parsedResults.layoutStyle[index];
                    layoutStyle.push(element)
                }
            }

            resolve()

        } else {
            console.log(" -> NO USER !!!")
            reject()
        }
    })
}

export const useExport = async (param1, param2, param3, param4) => {
    // Convert the JSON object to a string
    let blobData
    let exportName = param2 
    if (param3 != null){
        exportName = exportName + "_" + param3
    }
    
    let exportExt
    let csvSeparation = ";"

    if (param1 == "json") {
        const jsonData = JSON.stringify(param4, null, 2);

        // Create a blob from the JSON string
        blobData = new Blob([jsonData], { type: "application/json" });
        exportExt = ".json"

    }
    if (param1 == "csv") {
        // Extract the header row from the JSON object
        const headers = Object.keys(param4[0]);
        const csvRows = [headers.join(csvSeparation)];

        // Convert the JSON object to a CSV string
        param4.forEach(row => {
            const csvRow = headers.map(header => {
                return row[header];
            }).join(csvSeparation);
            csvRows.push(csvRow);
        });

        // Create a blob from the CSV string
        const csvString = csvRows.join("\n");
        blobData = new Blob([csvString], { type: "text/csv" });
        exportExt = ".csv"

    }

    // Create a link element to download the file
    const url = URL.createObjectURL(blobData);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportName + "" + exportExt
    a.click();

    // Release the blob URL
    URL.revokeObjectURL(url);
}
/**************************************
* DATE FORMATS
**************************************/
export function useDateNumberFormat(param) {
    return Number(Math.trunc(param)) //we have to use /1000 and not unix because or else does not take into account tz
}

export function useDateCalFormat(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("YYYY-MM-DD")
}

export function useDateCalFormatMonth(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("YYYY-MM")
}

export function useTimeFormat(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("HH:mm:ss")
}

export function useTimeFormatFromDate(param) {
    return dayjs(param).tz(timeZoneTrade.value).format("HH:mm:ss")
}

export function useTimeDuration(param) {
    return dayjs.duration(param * 1000).format("HH:mm:ss")
}

export function useIBKREndDateTimeFormat(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("YYYYMMDD HH:mm:ss")
}

export function useSwingDuration(param) {
    let duration = Number(dayjs.duration(param * 1000).format("D"))
    let period
    duration > 1 ? period = "days" : period = "day"
    return (duration + " " + period)
}

export function useHourMinuteFormat(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("HH:mm")
}

export function useDateTimeFormat(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("YYYY-MM-DD HH:mm:ss")
}

export function useChartFormat(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("l")
}

export function useMonthFormat(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("MMMM YYYY")
}

export function useMonthFormatShort(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("MMM YY")
}

export function useCreatedDateFormat(param) {
    return dayjs.unix(param).tz(timeZoneTrade.value).format("ddd DD MMMM YYYY")
}

export function useDatetimeLocalFormat(param) {
    return dayjs.tz(param * 1000, timeZoneTrade.value).format("YYYY-MM-DDTHH:mm:ss") //here we ne
}

export function useStartOfDay(param) {
    return dayjs(param * 1000).tz(timeZoneTrade.value).startOf("day").unix()
}
/**************************************
* NUMBER FORMATS
**************************************/
export function useThousandCurrencyFormat(param) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, style: 'currency', currency: 'USD' }).format(param)
}

export function useThousandFormat(param) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(param)
}

export function useTwoDecCurrencyFormat(param) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, style: 'currency', currency: 'USD' }).format(param)
}

export function useThreeDecCurrencyFormat(param) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3, style: 'currency', currency: 'USD' }).format(param)
}

export function useXDecCurrencyFormat(param, param2) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: param2, style: 'currency', currency: 'USD' }).format(param)
}

export function useTwoDecFormat(param) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(param)
}

export function useXDecFormat(param, param2) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: param2 }).format(param)
}

export function useOneDecPercentFormat(param) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, style: 'percent' }).format(param)
}

export function useTwoDecPercentFormat(param) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, style: 'percent' }).format(param)
}

export function useFormatBytes(param, decimals = 2) {
    if (param === 0) return '0 bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['param', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(param) / Math.log(k));
    return parseFloat((param / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function useDecimalsArithmetic(param1, param2) {
    //https://flaviocopes.com/javascript-decimal-arithmetics/
    return ((param1.toFixed(6) * 100) + (param2.toFixed(6) * 100)) / 100
}


/**************************************
* CLOUD
**************************************/

export const useCheckCloudPayment = (param1) => {
    return new Promise(async (resolve, reject) => {
        try {
            let currentUser = param1
            // Make the API call
            const response = await axios.post('/api/checkCloudPayment', {
                currentUser: currentUser,
            });

            //console.log('Response:', JSON.stringify(response));

            // Resolve or reject based on response
            if (response.status === 200) {
                resolve(response.data); // Resolve with response data
            } else {
                reject(new Error(' -> Payment check failed. Redirecting to payment page.'));
            }
        } catch (error) {
            console.error(' -> Error during validation:', error);
            reject(error); // Reject with the caught error
        }
    });
};

export const useGetStripePk = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get('/api/getStripePk', {
            });

            //console.log('Response:', JSON.stringify(response));

            // Resolve or reject based on response
            if (response.status === 200) {
                resolve(response.data); // Resolve with response data
            } else {
                reject(new Error(' -> Failed to get Stripe pk.'));
            }
        } catch (error) {
            console.error(' -> Error getting Stripe pk:', error);
            reject(error); // Reject with the caught error
        }
    });
};

