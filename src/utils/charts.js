import { totals, amountCase, totalsByDate, pageId, selectedTimeFrame, groups, timeZoneTrade, selectedRatio, filteredTrades, selectedGrossNet, satisfactionArray, dailyChartZoom, barChartNegativeTagGroups } from "../stores/globals.js"
import { useOneDecPercentFormat, useChartFormat, useThousandCurrencyFormat, useTwoDecCurrencyFormat, useTimeFormat, useHourMinuteFormat, useCapitalizeFirstLetter, useXDecCurrencyFormat, useXDecFormat } from "./utils.js"
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
import * as echarts from 'echarts';

const cssColor87 = "rgba(255, 255, 255, 0.87)"
const cssColor60 = "rgba(255, 255, 255, 0.60)"
const cssColor38 = "rgba(255, 255, 255, 0.38)"
const blackbg0 = "hsl(0, 0%, 0%)"
const blackbg5 = "hsl(0, 0%, 5%)"
const blackbg7 = "hsl(0, 0%, 7%)"
const white87 = "hsla(0, 0%, 100%, 0.87)"
const white60 = "hsla(0, 0%, 100%, 0.6)"
const white38 = "hsla(0, 0%, 100%, 0.38)"
const maxChartValues = 20


export async function useECharts(param) {
    for (let index = 1; index <= 2; index++) {
        var chartId = 'pieChart' + index
        //console.log("chartId " + chartId)
        if (param == "clear") {
            echarts.init(document.getElementById(chartId)).clear()
        }

        if (param == "init") {
            let green
            let red
            if (index == 1) {
                //green = probWins
                //red = probLoss
                green = (totals[amountCase.value + 'WinsCount'] / totals.trades)
                red = (totals[amountCase.value + 'LossCount'] / totals.trades)
                await usePieChart(chartId, green, red)

            }
            if (index == 2 && satisfactionArray.length > 0) {
                //green = satisfied
                //red = dissatisfied
                //console.log(" satisfactionArray " + JSON.stringify(satisfactionArray))
                let satisfied = satisfactionArray.filter(obj => obj.satisfaction == true).length
                let dissatisfied = satisfactionArray.filter(obj => obj.satisfaction == false).length
                if (satisfactionArray.length > 0) {
                    green = satisfied / satisfactionArray.length
                    red = dissatisfied / satisfactionArray.length
                }
                await usePieChart(chartId, green, red)
            }
        }
    }

    function handleCharts(prefix, useChartFunction) {
        let elements = document.querySelectorAll(`[id^="${prefix}"]`);
        elements.forEach(element => {
            if (param == "clear") {
                echarts.init(element).clear();
            }
            if (param == "init" || param == prefix) {
                useChartFunction(element.id);
            }
        });
    }

    // Call the function for each chart type
    handleCharts('lineBarChart', useLineBarChart);
    handleCharts('barChart', useBarChart);
    handleCharts('barChartNegative', useBarChartNegative);

}

export function useRenderDoubleLineChart() {
    return new Promise(async (resolve, reject) => {
        await filteredTrades.forEach(el => {
            //console.log(" date "+el.dateUnix)
            var chartId = 'doubleLineChart' + el.dateUnix
            var chartDataGross = []
            var chartDataNet = []
            var chartCategories = []
            el.trades.forEach(element => {
                var proceeds = Number((element.grossProceeds).toFixed(2))
                //console.log("proceeds "+proceeds)
                var proceedsNet = Number((element[amountCase.value + 'Proceeds']).toFixed(2))
                if (chartDataGross.length == 0) {
                    chartDataGross.push(proceeds)
                } else {
                    chartDataGross.push(chartDataGross.slice(-1).pop() + proceeds)
                }

                if (chartDataNet.length == 0) {
                    chartDataNet.push(proceedsNet)
                } else {
                    chartDataNet.push(chartDataNet.slice(-1).pop() + proceedsNet)
                }
                chartCategories.push(useHourMinuteFormat(element.exitTime))
                //console.log("chartId "+chartId+", chartDataGross "+chartDataGross+", chartDataNet "+chartDataNet+", chartCategories "+chartCategories)
            });
            useDoubleLineChart(chartId, chartDataGross, chartDataNet, chartCategories)
        })
        resolve()
    })
}

export function useRenderPieChart() {
    return new Promise(async (resolve, reject) => {
        await filteredTrades.forEach(el => {
            var chartId = "pieChart" + el.dateUnix
            var probWins = (el.pAndL[amountCase.value + 'WinsCount'] / el.pAndL.trades)
            var probLoss = (el.pAndL[amountCase.value + 'LossCount'] / el.pAndL.trades)
            //var probNetWins = (el.pAndL.netWinsCount / el.pAndL.trades)
            //var probNetLoss = (el.pAndL.netLossCount / el.pAndL.trades)
            //console.log("prob net win " + probNetWins + " and loss " + probNetLoss)
            usePieChart(chartId, probWins, probLoss, pageId.value)
        })
        resolve()
    })
}

export function useLineChart(param) { //chartID, chartDataGross, chartDataNet, chartCategories
    console.log("  --> " + param)
    return new Promise((resolve, reject) => {
        var myChart = echarts.init(document.getElementById(param));
        var chartData = []
        var chartXAxis = []
        var wins = 0
        var loss = 0
        var profitFactor = 0
        var weekOfYear = null
        var monthOfYear = null
        var i = 1

        let objectY = JSON.parse(JSON.stringify(totalsByDate))
        const keys = Object.keys(objectY);

        for (const key of keys) {
            var element = objectY[key]
            //console.log("\nElement "+JSON.stringify(element))

            var pushingChartData = () => {
                chartData.push(profitFactor)
            }

            if (selectedTimeFrame.value == "daily") {
                wins = parseFloat(element[amountCase.value + 'Wins']).toFixed(2)
                loss = parseFloat(-element[amountCase.value + 'Loss']).toFixed(2)
                //console.log("wins " + wins + " and loss " + loss)
                if (loss != 0) {
                    profitFactor = wins / loss
                    //console.log(" -> profitFactor "+profitFactor)
                }
                chartXAxis.push(useChartFormat(key))
                pushingChartData()
            }

            if (selectedTimeFrame.value == "weekly") {
                //First value
                if (weekOfYear == null) {
                    weekOfYear = dayjs.unix(key).isoWeek()
                    wins += element[amountCase.value + 'Wins']
                    loss += -element[amountCase.value + 'Loss']
                    chartXAxis.push(useChartFormat(key))

                } else if (weekOfYear == dayjs.unix(key).isoWeek()) { //Must be "else if" or else calculates twice : once when null and then this time.value
                    wins += element[amountCase.value + 'Wins']
                    loss += -element[amountCase.value + 'Loss']
                }
                if (dayjs.unix(key).isoWeek() != weekOfYear) {
                    //When week changes, we create values proceeds and push both chart datas
                    if (loss != 0) {
                        profitFactor = wins / loss
                    }
                    pushingChartData()

                    //New week, new proceeds
                    wins = 0
                    loss = 0
                    profitFactor = 0
                    weekOfYear = dayjs.unix(key).isoWeek()
                    wins += element[amountCase.value + 'Wins']
                    loss += -element[amountCase.value + 'Loss']
                    chartXAxis.push(useChartFormat(dayjs.unix(key).startOf('isoWeek') / 1000))
                }
                if (i == keys.length) {
                    //Last key. We wrap up.
                    if (loss != 0) {
                        profitFactor = wins / loss
                    }
                    pushingChartData()
                    //console.log("Last element")
                }
            }

            if (selectedTimeFrame.value == "monthly") {
                //First value
                if (monthOfYear == null) {
                    monthOfYear = dayjs.unix(key).month()
                    wins += element[amountCase.value + 'Wins']
                    loss += -element[amountCase.value + 'Loss']
                    chartXAxis.push(useChartFormat(key))

                }
                //Same month. Let's continue adding proceeds
                else if (monthOfYear == dayjs.unix(key).month()) {
                    wins += element[amountCase.value + 'Wins']
                    loss += -element[amountCase.value + 'Loss']
                }
                if (dayjs.unix(key).month() != monthOfYear) {
                    //When week changes, we create values proceeds and push both chart datas
                    profitFactor = wins / loss
                    pushingChartData()

                    //New month, new proceeds
                    wins = 0
                    loss = 0
                    profitFactor = 0
                    monthOfYear = dayjs.unix(key).month()
                    wins += element[amountCase.value + 'Wins']
                    loss += -element[amountCase.value + 'Loss']
                    chartXAxis.push(useChartFormat(dayjs.unix(key).startOf('month') / 1000))
                }
                if (i == keys.length) {
                    //Last key. We wrap up.
                    profitFactor = wins / loss
                    pushingChartData()
                }
            }
            i++

            //console.log("element "+JSON.stringify(element))
        }
        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: blackbg7,
                borderColor: blackbg7,
                textStyle: {
                    color: white87.value
                },
                formatter: (params) => {
                    return params[0].value.toFixed(2)

                }
            },
            axisLabel: {
                interval: 1000,
            },
            xAxis: {
                type: 'category',
                data: chartXAxis,
            },
            yAxis: {
                type: 'value',
                splitLine: {
                    lineStyle: {
                        type: 'solid',
                        color: cssColor38
                    }
                },
                axisLabel: {
                    formatter: (params) => {
                        return params.toFixed(2)
                    }
                },
            },
            series: [{
                data: chartData,
                type: 'line',
                smooth: true,
                itemStyle: {
                    color: '#35C4FE',
                },
                emphasis: {
                    itemStyle: {
                        color: '#01B4FF'
                    }
                },
            }]
        }
        myChart.setOption(option);
        resolve()
    })
}

export function useDoubleLineChart(param1, param2, param3, param4) { //chartID, chartDataGross, chartDataNet, chartCategories
    //console.log("param1 "+param1+", param2 "+param2+", param3 "+param3+", param4 "+param4)
    return new Promise((resolve, reject) => {
        //console.log("param1 "+param1)
        var myChart = echarts.init(document.getElementById(param1));
        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: blackbg7,
                borderColor: blackbg7,
                textStyle: {
                    color: white87.value
                },
                formatter: (params) => {
                    var gross
                    var net
                    var time
                    params.forEach((element, index) => {
                        //console.log('element ' + JSON.stringify(element))
                        if (index == 0) {
                            gross = element.value.toFixed(0) + "$"
                            time = element.name
                        }
                        if (index == 1) {
                            net = element.value.toFixed(0) + "$"
                        }
                    });
                    //console.log("params "+JSON.stringify(params[0][0]))
                    //console.log('time format ' + typeof time + "time " + time)
                    return time + "<br>Gross: " + gross + "<br>Net: " + net

                }
            },
            axisLabel: {

            },
            xAxis: {
                data: param4,
                name: '0',
                nameLocation: 'start',
            },
            yAxis: {
                type: 'value',
                /*scale: true,
                max: function(value) {
                    return value.max;
                },
                min: function(value) {
                    return value.min;
                },*/
                axisLabel: {
                    show: false,
                    formatter: (params) => {
                        return params.toFixed(0) + "$"
                    }
                },
                splitLine: {
                    show: false
                },
            },
            series: [{
                data: param2,
                showSymbol: false, //removes dot on line
                type: 'line',
                smooth: true,
                itemStyle: {
                    color: '#35C4FE',
                },
                emphasis: {
                    itemStyle: {
                        color: '#01B4FF'
                    }
                },
            },
            {
                data: param3,
                showSymbol: false, //removes dot on line
                type: 'line',
                smooth: true,
                itemStyle: {
                    color: '#9AE3FD',
                },
                emphasis: {
                    itemStyle: {
                        color: '#9AE3FD'
                    }
                },
            }
            ],
        }
        myChart.setOption(option);
        resolve()
    })
}

export function useLineBarChart(param) {
    //console.log("  --> " + param)
    return new Promise((resolve, reject) => {
        var myChart = echarts.init(document.getElementById(param));
        var chartData = []
        var chartBarData = []
        var chartXAxis = []
        var sumProceeds = 0
        var weekOfYear = null
        var monthOfYear = null
        var i = 1

        let objectY = JSON.parse(JSON.stringify(totalsByDate))
        const keys = Object.keys(objectY);

        for (const key of keys) {
            var element = objectY[key]
            var proceeds = 0

            var pushingChartBarData = () => {
                if (keys.length <= maxChartValues) {
                    var temp = {}
                    temp.value = proceeds
                    temp.label = {}
                    temp.label.show = true
                    if (proceeds >= 0) {
                        temp.label.position = 'top'
                    } else {
                        temp.label.position = 'bottom'
                    }
                    temp.label.formatter = (params) => {
                        return useThousandCurrencyFormat(params.value)
                    }
                    chartBarData.push(temp)
                } else {
                    chartBarData.push(proceeds)
                }
            }

            var pushingChartData = () => {
                if (chartData.length == 0) {
                    chartData.push(proceeds)
                } else {
                    chartData.push(chartData.slice(-1).pop() + proceeds)
                }
            }

            if (selectedTimeFrame.value == "daily") {
                proceeds = element[amountCase.value + 'Proceeds']
                chartXAxis.push(useChartFormat(key))
                pushingChartBarData()
                pushingChartData()
            }

            if (selectedTimeFrame.value == "weekly") {
                //First value
                if (weekOfYear == null) {
                    weekOfYear = dayjs.unix(key).isoWeek()
                    sumProceeds += element[amountCase.value + 'Proceeds']
                    //console.log("First run. Week of year: "+weekOfYear+" and month of year "+ dayjs.unix(key).month()+" and start of week "+dayjs.unix(key).startOf('isoWeek')+" and month of start of week "+dayjs.unix(dayjs.unix(key).startOf('isoWeek')/1000).month())
                    //If start of week is another month
                    /*if (dayjs.unix(key).month() != dayjs.unix(dayjs.unix(key).startOf('isoWeek') / 1000).month()) {
                        chartXAxis.push(useChartFormat(key))
                    } else {
                        chartXAxis.push(useChartFormat(dayjs.unix(key).startOf('isoWeek') / 1000))
                    }*/
                    //First I did the logic above. But I realized that it makes difficult to compare. Expl: 1 month you will have from 1/09, then 06/09. But then, last two weeks, the 06/09 value will not be the same, because two weeks back is actually starting at 07/09.So, for the first, we always push the key
                    chartXAxis.push(useChartFormat(key))

                } else if (weekOfYear == dayjs.unix(key).isoWeek()) { //Must be "else if" or else calculates twice : once when null and then this time.value
                    //console.log("Same week. Week of year: " + weekOfYear)
                    sumProceeds += element[amountCase.value + 'Proceeds']
                }
                if (dayjs.unix(key).isoWeek() != weekOfYear) {
                    //When week changes, we create values proceeds and push both chart datas
                    proceeds = sumProceeds
                    pushingChartBarData()
                    pushingChartData()

                    //New week, new proceeds
                    sumProceeds = 0
                    weekOfYear = dayjs.unix(key).isoWeek()
                    //console.log("New week. Week of year: " + weekOfYear + " and start of week " + dayjs.unix(key).startOf('isoWeek'))
                    sumProceeds += element[amountCase.value + 'Proceeds']
                    chartXAxis.push(useChartFormat(dayjs.unix(key).startOf('isoWeek') / 1000))
                }
                if (i == keys.length) {
                    //Last key. We wrap up.
                    proceeds = sumProceeds
                    pushingChartBarData()
                    pushingChartData()
                    //console.log("Last element")
                }
            }

            if (selectedTimeFrame.value == "monthly") {
                //First value
                if (monthOfYear == null) {
                    monthOfYear = dayjs.unix(key).month()
                    sumProceeds += element[amountCase.value + 'Proceeds']
                    chartXAxis.push(useChartFormat(key))

                }
                //Same month. Let's continue adding proceeds
                else if (monthOfYear == dayjs.unix(key).month()) {
                    //console.log("Same week. Week of year: " + monthOfYear)
                    sumProceeds += element[amountCase.value + 'Proceeds']
                }
                if (dayjs.unix(key).month() != monthOfYear) {
                    //When week changes, we create values proceeds and push both chart datas
                    proceeds = sumProceeds
                    pushingChartBarData()
                    pushingChartData()

                    //New month, new proceeds
                    sumProceeds = 0
                    monthOfYear = dayjs.unix(key).month()
                    //console.log("New week. Week of year: " + monthOfYear + " and start of week " + dayjs.unix(key).startOf('month'))
                    sumProceeds += element[amountCase.value + 'Proceeds']
                    chartXAxis.push(useChartFormat(dayjs.unix(key).startOf('month') / 1000))
                }
                if (i == keys.length) {
                    //Last key. We wrap up.
                    proceeds = sumProceeds
                    pushingChartBarData()
                    pushingChartData()
                    sumProceeds = 0
                    //console.log("Last element")
                }
            }
            i++

            //console.log("element "+JSON.stringify(element))
        }
        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: blackbg7,
                borderColor: blackbg7,
                textStyle: {
                    color: white87.value
                },
                formatter: (params) => {
                    var proceeds
                    var cumulProceeds
                    var date
                    params.forEach((element, index) => {
                        if (index == 0) {
                            cumulProceeds = useThousandCurrencyFormat(element.value)
                            date = element.name
                        }
                        if (index == 1) {
                            proceeds = useThousandCurrencyFormat(element.value)
                        }
                    });
                    //console.log("params "+JSON.stringify(params[0][0]))
                    return date + "<br>Proceeds: " + proceeds + "<br>Cumulated: " + cumulProceeds

                }
            },
            axisLabel: {
                interval: 1000,
            },
            xAxis: {
                type: 'category',
                data: chartXAxis,
            },
            yAxis: {
                type: 'value',
                splitLine: {
                    lineStyle: {
                        type: 'solid',
                        color: cssColor38
                    }
                },
                axisLabel: {
                    formatter: (params) => {
                        return useThousandCurrencyFormat(params)
                    }
                },
            },
            series: [{
                data: chartData,
                type: 'line',
                smooth: true,
                itemStyle: {
                    color: '#35C4FE',
                },
                emphasis: {
                    itemStyle: {
                        color: '#01B4FF'
                    }
                },
            },
            {
                data: chartBarData,
                type: 'bar',
                smooth: true,
                label: {
                    color: cssColor87
                },
                itemStyle: {
                    color: '#35C4FE',
                },
                emphasis: {
                    itemStyle: {
                        color: '#01B4FF'
                    }
                },
            }
            ]
        }
        myChart.setOption(option);
        resolve()
    })
}

export function usePieChart(param1, param2, param3) { //chart ID, green, red, page
    return new Promise((resolve, reject) => {
        //console.log("  --> " + param1)
        //console.log("para 2 " + param2 + " and 3 " + param3)
        let myChart = echarts.init(document.getElementById(param1));
        let green = param2
        let red = param3
        const option = {
            series: [{
                type: 'pie',
                radius: ['70%', '100%'],
                avoidLabelOverlap: false,
                data: [
                    { value: green },
                    { value: red },
                ],
                itemStyle: {
                    color: (params) => {
                        if (params.dataIndex == 0) {
                            return '#00CA73'
                        }
                        if (params.dataIndex == 1) {
                            return '#f2f2f4'
                        }
                    }
                },
                label: {
                    show: true,
                    position: 'center',
                    color: cssColor87,
                    formatter: (params) => {
                        if (pageId.value == "dashboard") {
                            let rate
                            if (param1 == "pieChart1") {
                                rate = "\nWin rate"
                            }
                            if (param1 == "pieChart2") {
                                rate = "\nSatisfaction"
                            }
                            return useOneDecPercentFormat(green) + rate
                        }
                        if (pageId.value == "daily") {
                            return useOneDecPercentFormat(green)
                        }
                    }
                },
                emphasis: {
                    disabled: true
                },
            },

            ]
        };
        myChart.setOption(option);
        resolve()
    })
}

export function useBarChart(param1) {
    //console.log("  --> " + param1)
    return new Promise((resolve, reject) => {
        var chartData = []
        var chartXAxis = []

        var sumTrades = 0
        var sumWinsCount = 0
        var probWins


        var wins = 0
        var loss = 0
        var profitFactor = 0

        let proceeds = 0
        let trades = 0
        let quantities = 0

        var appt
        var apps

        var weekOfYear = null
        var monthOfYear = null
        var i = 1

        //console.log("totals " + JSON.stringify(totalsByDate))
        let objectY = JSON.parse(JSON.stringify(totalsByDate))
        const keys = Object.keys(objectY);
        for (const key of keys) {
            var element = objectY[key]
            var ratio

            var pushingChartData = () => {
                if (selectedRatio.value == "appt") {
                    ratio = appt
                }
                if (selectedRatio.value == "apps") {
                    ratio = apps
                }
                if (selectedRatio.value == "profitFactor") {
                    ratio = profitFactor
                }

                if (param1 == "barChart1") {
                    if (keys.length <= maxChartValues) {
                        var temp = {}
                        temp.value = ratio
                        temp.label = {}
                        temp.label.show = true
                        if (ratio >= 0) {
                            temp.label.position = 'top'
                        } else {
                            temp.label.position = 'bottom'
                        }
                        temp.label.formatter = (params) => {
                            let decimals = 0
                            if (selectedRatio.value == "appt" || selectedRatio.value == "profitFactor") {
                                decimals = 2
                            }
                            if (selectedRatio.value == "apps") {
                                decimals = 4
                            }
                            if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                                return useXDecCurrencyFormat(params.value, decimals)
                            }
                            if (selectedRatio.value == "profitFactor") {
                                return useXDecFormat(params.value, decimals)
                            }
                        }
                        chartData.push(temp)
                    } else {
                        chartData.push(ratio)
                    }
                }

                if (param1 == "barChart2") {
                    if (keys.length <= maxChartValues) {
                        var temp = {}
                        temp.value = probWins
                        temp.label = {}
                        temp.label.show = true
                        temp.label.position = 'top'
                        temp.label.formatter = (params) => {
                            return useOneDecPercentFormat(params.value)
                        }
                        chartData.push(temp)
                    } else {
                        chartData.push(probWins)
                    }

                }
            }

            if (selectedTimeFrame.value == "daily") {
                if (selectedRatio.value == "profitFactor") {
                    wins = parseFloat(element[amountCase.value + 'Wins']).toFixed(2)
                    loss = parseFloat(-element[amountCase.value + 'Loss']).toFixed(2)
                    //console.log("wins " + wins + " and loss " + loss)
                    if (loss != 0) {
                        profitFactor = wins / loss
                        //console.log(" -> profitFactor "+profitFactor)
                    }
                }
                if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                    proceeds = element[amountCase.value + 'Proceeds']
                    trades = element.trades
                    quantities = element.buyQuantity

                    appt = proceeds / trades
                    apps = proceeds / quantities
                }

                //For win rate
                probWins = (element[amountCase.value + 'WinsCount'] / element.trades)

                chartXAxis.push(useChartFormat(key))
                pushingChartData()
            }


            if (selectedTimeFrame.value == "weekly") {
                //First value
                if (weekOfYear == null) {
                    weekOfYear = dayjs.unix(key).isoWeek()

                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        proceeds += element[amountCase.value + 'Proceeds']
                        trades += element.trades
                        quantities += element.buyQuantity
                    }
                    if (selectedRatio.value == "profitFactor") {
                        wins += element[amountCase.value + 'Wins']
                        loss += -element[amountCase.value + 'Loss']
                    }

                    sumWinsCount += element[amountCase.value + 'WinsCount']
                    sumTrades += element.trades

                    chartXAxis.push(useChartFormat(key))

                } else if (weekOfYear == dayjs.unix(key).isoWeek()) {
                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        proceeds += element[amountCase.value + 'Proceeds']
                        trades += element.trades
                        quantities += element.buyQuantity
                    }

                    if (selectedRatio.value == "profitFactor") {
                        wins += element[amountCase.value + 'Wins']
                        loss += -element[amountCase.value + 'Loss']
                    }

                    sumWinsCount += element[amountCase.value + 'WinsCount']
                    sumTrades += element.trades
                }


                if (dayjs.unix(key).isoWeek() != weekOfYear) {
                    //When week changes, we create values proceeds and push both chart datas
                    if (selectedRatio.value == "profitFactor") {
                        if (loss != 0) {
                            profitFactor = wins / loss
                        }
                    }

                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        appt = proceeds / trades
                        apps = proceeds / quantities
                    }

                    probWins = (sumWinsCount / sumTrades)

                    pushingChartData()


                    //New week, new proceeds
                    weekOfYear = dayjs.unix(key).isoWeek()

                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        proceeds = 0
                        trades = 0
                        quantities = 0
                        appt = 0
                        apps = 0
                        proceeds += element[amountCase.value + 'Proceeds']
                        trades += element.trades
                        quantities += element.buyQuantity

                    }
                    if (selectedRatio.value == "profitFactor") {
                        wins = 0
                        loss = 0
                        profitFactor = 0
                        wins += element[amountCase.value + 'Wins']
                        loss += -element[amountCase.value + 'Loss']
                    }

                    sumWinsCount = 0
                    sumTrades = 0
                    sumWinsCount += element[amountCase.value + 'WinsCount']
                    sumTrades += element.trades

                    chartXAxis.push(useChartFormat(dayjs.unix(key).startOf('isoWeek') / 1000))
                }
                if (i == keys.length) {
                    //Last key. We wrap up.

                    if (selectedRatio.value == "profitFactor") {
                        if (loss != 0) {
                            profitFactor = wins / loss
                        }
                    }

                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        appt = proceeds / trades
                        apps = proceeds / quantities
                    }

                    probWins = (sumWinsCount / sumTrades)

                    pushingChartData()
                    //console.log("Last element")
                }
            }

            if (selectedTimeFrame.value == "monthly") {

                if (monthOfYear == null) {
                    monthOfYear = dayjs.unix(key).month()
                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        proceeds += element[amountCase.value + 'Proceeds']
                        trades += element.trades
                        quantities += element.buyQuantity
                    }

                    if (selectedRatio.value == "profitFactor") {
                        wins += element[amountCase.value + 'Wins']
                        loss += -element[amountCase.value + 'Loss']
                    }

                    sumWinsCount += element[amountCase.value + 'WinsCount']
                    sumTrades += element.trades

                    chartXAxis.push(useChartFormat(key))

                }
                //Same month. Let's continue adding proceeds
                else if (monthOfYear == dayjs.unix(key).month()) {
                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        proceeds += element[amountCase.value + 'Proceeds']
                        trades += element.trades
                        quantities += element.buyQuantity
                    }

                    if (selectedRatio.value == "profitFactor") {
                        wins += element[amountCase.value + 'Wins']
                        loss += -element[amountCase.value + 'Loss']
                    }

                    sumWinsCount += element[amountCase.value + 'WinsCount']
                    sumTrades += element.trades

                }
                if (dayjs.unix(key).month() != monthOfYear) {
                    //When week changes, we create values proceeds and push both chart datas
                    if (selectedRatio.value == "profitFactor") {
                        //When week changes, we create values proceeds and push both chart datas
                        profitFactor = wins / loss

                    }

                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        appt = proceeds / trades
                        apps = proceeds / quantities
                    }

                    probWins = (sumWinsCount / sumTrades)

                    pushingChartData()

                    monthOfYear = dayjs.unix(key).month()
                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        proceeds = 0
                        trades = 0
                        quantities = 0
                        appt = 0
                        apps = 0
                        proceeds += element[amountCase.value + 'Proceeds']
                        trades += element.trades
                        quantities += element.buyQuantity

                    }
                    if (selectedRatio.value == "profitFactor") {
                        wins = 0
                        loss = 0
                        profitFactor = 0
                        wins += element[amountCase.value + 'Wins']
                        loss += -element[amountCase.value + 'Loss']
                    }

                    sumWinsCount = 0
                    sumTrades = 0
                    sumWinsCount += element[amountCase.value + 'WinsCount']
                    sumTrades += element.trades

                    chartXAxis.push(useChartFormat(dayjs.unix(key).startOf('month') / 1000))
                }
                if (i == keys.length) {
                    //Last key. We wrap up.

                    if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                        appt = proceeds / trades
                        apps = proceeds / quantities
                    }

                    if (selectedRatio.value == "profitFactor") {
                        profitFactor = wins / loss
                    }

                    probWins = (sumWinsCount / sumTrades)

                    pushingChartData()
                }
            }
            //console.log("proceeds " + proceeds)
            i++


        }
        var myChart = echarts.init(document.getElementById(param1));
        const option = {
            xAxis: {
                type: 'category',
                data: chartXAxis
            },
            yAxis: {
                type: 'value',
                splitLine: {
                    lineStyle: {
                        type: 'solid',
                        color: cssColor38
                    }
                },
                axisLabel: {
                    formatter: (params) => {
                        if (param1 == "barChart2") {
                            return useOneDecPercentFormat(params)
                        }
                        if (param1 == "barChart1") {
                            let decimals = 0
                            if (selectedRatio.value == "appt" || selectedRatio.value == "profitFactor") {
                                decimals = 2
                            }
                            if (selectedRatio.value == "apps") {
                                decimals = 4
                            }
                            if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                                return useXDecCurrencyFormat(params, decimals)
                            }
                            if (selectedRatio.value == "profitFactor") {
                                return useXDecFormat(params, decimals)
                            }
                        }
                    }
                },
            },
            series: [{
                data: chartData,
                type: 'bar',
                label: {
                    color: cssColor87
                },
                itemStyle: {
                    color: '#35C4FE',
                },
                emphasis: {
                    itemStyle: {
                        color: '#01B4FF'
                    }
                },
            }],
            tooltip: {
                trigger: 'axis',
                backgroundColor: blackbg7,
                borderColor: blackbg7,
                textStyle: {
                    color: white87.value
                },
                formatter: (params) => {
                    if (param1 == "barChart2") {
                        return params[0].name + "<br>" + useOneDecPercentFormat(params[0].value)
                    }
                    if (param1 == "barChart1") {
                        let decimals = 0
                        if (selectedRatio.value == "appt" || selectedRatio.value == "profitFactor") {
                            decimals = 2
                        }
                        if (selectedRatio.value == "apps") {
                            decimals = 4
                        }
                        if (selectedRatio.value == "appt" || selectedRatio.value == "apps") {
                            return params[0].name + "<br>" + useXDecCurrencyFormat(params[0].value, decimals)
                        }
                        if (selectedRatio.value == "profitFactor") {
                            return params[0].name + "<br>" + useXDecFormat(params[0].value, decimals)
                        }
                    }
                }
            },
        };
        myChart.setOption(option);
        resolve()
    })
}

export function useBarChartNegative(param1) {
    //console.log("  --> " + param1)
    var appt
    var apps
    return new Promise((resolve, reject) => {
        var yAxis = []
        var series = []
        let yName = []
        var keyObject
        if (param1 == "barChartNegative1") {
            keyObject = groups.timeframe
        }
        if (param1 == "barChartNegative2") {
            keyObject = groups.duration
        }
        if (param1 == "barChartNegative3") {
            keyObject = groups.day
        }
        if (param1 == "barChartNegative4") {
            keyObject = groups.trades
        }
        if (param1 == "barChartNegative7") {
            keyObject = groups.executions
        }

        if (param1 == "barChartNegative12") {
            keyObject = groups.shareFloat
        }

        if (param1 == "barChartNegative13") {
            keyObject = groups.entryPrice
        }

        if (param1 == "barChartNegative14") {
            keyObject = groups.mktCap
        }

        if (param1 == "barChartNegative16") {
            keyObject = groups.symbols
        }

        if (param1 == "barChartNegative7") {
            keyObject = groups.executions
        }

        if (param1 == "barChartNegative17") {
            keyObject = groups.position
        }

        if (param1 == "barChartNegative18") {
            keyObject = groups.tags
        }

        //case for group tags
        let obj = barChartNegativeTagGroups.value.find(obj => param1.includes(obj.id));
        if (obj != undefined) {
            keyObject = groups[obj.id]
        }

        // KEYS are the different array of groups: so long/short, array of symbols, etc.
        const keys = Object.keys(keyObject);
        //console.log("object " + JSON.stringify(keyObject))

        for (const key of keys) {

            yAxis.unshift(key) // unshift because I'm only able to sort timeframe ascending

            //console.log("yaxis "+JSON.stringify(yAxis))
            var sumWins = 0
            var sumLoss = 0
            let sumProceeds = 0
            var trades = 0
            let quantities = 0
            var profitFactor = 0
            var numElements = keyObject[key].length

            //console.log("num elemnets " + numElements)

            //console.log(" key "+key)
            keyObject[key].forEach((element, index) => {
                //console.log("index " + index)
                sumWins += element[amountCase.value + 'Wins']
                sumLoss += element[amountCase.value + 'Loss']

                //console.log(" symbol "+element.symbol)
                //console.log(" element "+JSON.stringify(element))
                //console.log(" proceeds "+element[amountCase.value + 'Proceeds'])
                sumProceeds += element[amountCase.value + 'Proceeds']

                if (param1 == "barChartNegative4") {
                    trades += element.trades
                } else {
                    trades += element.tradesCount
                }
                quantities += element.buyQuantity


                //console.log(" sumProceeds "+sumProceeds)
                //console.log(" trades "+trades)

                //console.log("wins count "+element.sumWinsCount+", loss count "+element.sumLossCount+", wins "+element.wins+", loss "+element.netLoss+", trades "+element.tradesCount)
                if (numElements == (index + 1)) {

                    appt = sumProceeds == 0 && trades == 0 ? null : sumProceeds / trades


                    apps = sumProceeds == 0 && quantities == 0 ? null : sumProceeds / quantities

                    sumWins > 0 ? profitFactor = sumWins / -sumLoss : profitFactor = 0

                    //sumLoss > 0 ? profitFactor = sumWins / -sumLoss : profitFactor = "Infinity"

                    var ratio
                    if (selectedRatio.value == "appt") {
                        ratio = appt
                    }
                    if (selectedRatio.value == "apps") {
                        ratio = apps
                    }
                    if (selectedRatio.value == "profitFactor") {
                        ratio = profitFactor
                    }

                    //console.log(" ratio "+ratio)

                    if (param1 == "barChartNegative1" || param1 == "barChartNegative2" || param1 == "barChartNegative3" || param1 == "barChartNegative4" || param1 == "barChartNegative7" || param1 == "barChartNegative12" || param1 == "barChartNegative13" || param1 == "barChartNegative14" || param1 == "barChartNegative16" || param1 == "barChartNegative17" || param1 == "barChartNegative18" || obj != undefined) {
                        series.unshift(ratio)
                    }

                    if (param1 == "barChartNegative18" || obj != undefined) {
                        let temp = {}
                        temp.tagId = key
                        temp.tagName = element.tagName
                        yName.push(temp)
                    }
                }
            })
        }

        if (param1 == "barChartNegative16" || param1 == "barChartNegative17") {
            //1) combine the arrays:
            var list = [];
            for (var j = 0; j < series.length; j++) {

                //for group by Symbol, if open trade then ratio will be null, so no need to show on group by symbol chart
                if (series[j] != null) {
                    list.push({ 'ratio': series[j], 'name': yAxis[j] });
                    
                }
            }
            //2) sort:
            list.sort(function (a, b) {
                return ((a.ratio < b.ratio) ? -1 : ((a.ratio == b.ratio) ? 0 : 1));
                //Sort could be modified to, for example, sort on the age 
                // if the name is the same.
            });

            //console.log(" list " + JSON.stringify(list))
            //console.log(" series "+JSON.stringify(series))
            //3) separate them back out:
            // reinit arrays because in case of null, I have not included in list and I would sort series and yAxid but still leave space and leave some other values in place of the removed null
            series = []
            yAxis = []
            for (var k = 0; k < list.length; k++) {
                series[k] = list[k].ratio;
                //console.log(" series k "+JSON.stringify(series[k]))
                yAxis[k] = list[k].name;
                //console.log(" yAxis k "+JSON.stringify(yAxis[k]))
            }
            

            /*var indices = Array.from(series.keys()).sort((a, b) => series[a] > series[b])

            var sortedAPPT = indices.map(i => series[i])
            var sortedName = indices.map(i => yAxis[i])*/
            //console.log("Sorted ratio " + JSON.stringify(series)+" and names "+JSON.stringify(yAxis))

        }

        if (param1 == "barChartNegative18" || obj != undefined) {
            //1) combine the arrays:
            /*for (var k = 0; k < yName.length; k++) {
                yAxis[k] = yName[k];
            }*/
            //console.log(" yName "+JSON.stringify(yName))
            var list = [];
            for (var j = 0; j < series.length; j++)
                list.push({ 'ratio': series[j], 'name': yAxis[j] });
            //2) sort:
            list.sort(function (a, b) {
                return ((a.ratio < b.ratio) ? -1 : ((a.ratio == b.ratio) ? 0 : 1));
                //Sort could be modified to, for example, sort on the age 
                // if the name is the same.
            });
            //3) separate them back out:
            for (var k = 0; k < list.length; k++) {
                series[k] = list[k].ratio;
                let index = yName.findIndex(obj => obj.tagId == list[k].name)
                if (index != -1) {
                    yAxis[k] = yName[index].tagName
                } else {
                    console.log(" -> Index / tag name does not exist")
                }
            }

        }
        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: blackbg7,
                borderColor: blackbg7,
                textStyle: {
                    color: white87.value
                },
                axisPointer: {
                    type: 'shadow'
                },
                formatter: (params) => {
                    if (param1 == "barChartNegative16"){
                        return params[0].name + " " + useTwoDecCurrencyFormat(params[0].value)
                    }else{
                        return useTwoDecCurrencyFormat(params[0].value)
                    }
                }
            },
            grid: {
                top: 80,
                bottom: 30,
                containLabel: true // or else the yaxis labels are cutout
            },
            xAxis: {
                type: 'value',
                position: 'bottom',
                splitLine: {
                    lineStyle: {
                        type: 'solid',
                        color: cssColor38
                    }
                },
                axisLabel: {
                    formatter: (params) => {
                        if (selectedRatio.value == "profitFactor") {
                            return params.toFixed(0)
                        } else {
                            return useThousandCurrencyFormat(params)
                        }
                    }
                }
            },
            yAxis: {
                type: 'category',
                axisLine: { show: false },
                axisLabel: { show: true },
                axisTick: { show: false },
                splitLine: { show: false },
                data: yAxis,
                axisLabel: {
                    formatter: (params) => {
                        if (param1 == "barChartNegative4") {
                            if (params <= 30) {
                                var range
                                if (params <= 5) {
                                    range = 5
                                } else {
                                    range = 4
                                }
                                return (params - range) + "-" + params
                            }
                            if (params > 30) {
                                return "+30"
                            }
                        } else if (param1 == "barChartNegative2") { //Duration
                            //console.log("params "+params)
                            if (params < 1) {
                                return "00:00-00:59"
                            }
                            if (params >= 1 && params < 2) {
                                return "01:00-01:59"
                            }
                            if (params >= 2 && params < 5) {
                                return "02:00-04:59"
                            }
                            if (params >= 5 && params < 10) {
                                return "05:00-09:59"
                            }
                            if (params >= 10 && params < 20) {
                                return "10:00-19:59"
                            }
                            if (params >= 20 && params < 40) {
                                return "20:00-39:59"
                            }
                            if (params >= 40 && params < 60) {
                                return "40:00-59:59"
                            }
                            if (params >= 60) {
                                return "+60:00"
                            }
                        } else if (param1 == "barChartNegative3") { //Day of week
                            //console.log(dayjs.updateLocale('en').weekdays[params])
                            return dayjs.updateLocale('en').weekdays[params]
                        } else if (param1 == "barChartNegative13") {
                            //console.log("params "+params)
                            if (params < 30) {
                                if (params < 5) {
                                    return "0-4.99$"
                                } else {
                                    return params + "-" + (Number(params) + 4.99).toFixed(2) + "$"
                                }
                            }
                            if (params >= 30) {
                                return "+30$"
                            }
                        } else if (param1 == "barChartNegative12") { //Float
                            params = params / 1000000
                            if (params < 20) {
                                var range = 4.9
                                if (params < 5) {
                                    return "0-" + (params + range) + "M"
                                } else {
                                    return params + "M-" + (params + range) + "M"
                                }
                            }
                            if (params >= 20 && params < 50) {
                                var range = 9.9
                                return params + "M-" + (params + range) + "M"
                            }
                            if (params >= 50) {
                                return "+50M"
                            }
                        } else if (param1 == "barChartNegative14") {
                            params = params / 1000000
                            if (params <= 50) {
                                return "Nano-cap (0-" + params + "M)"
                            }
                            if (params > 50 && params <= 300) {
                                return "Micro-cap (50M-" + params + "M)"
                            }
                            if (params > 300 && params <= 2000) {
                                return "Small-cap (300M-" + params / 1000 + "B)"
                            }
                            if (params > 2000 && params <= 10000) {
                                return "Mid-cap (2B-" + params / 1000 + "B)"
                            } else {
                                return "Big-cap (+10B)"
                            }
                        } else if (param1 == "barChartNegative17") {
                            return (useCapitalizeFirstLetter(params))
                        }
                        else {
                            return params
                        }
                    }
                },
            },
            series: [{
                type: 'bar',
                itemStyle: {
                    color: '#35C4FE',
                },
                label: {
                    show: true,
                    position: "right",
                    color: cssColor87,
                    formatter: (params) => {
                        if (selectedRatio.value == "profitFactor") {
                            return params.value.toFixed(2)
                        } else {
                            let decimals = 0
                            if (selectedRatio.value == "appt") {
                                decimals = 2
                            }
                            if (selectedRatio.value == "apps") {
                                decimals = 4
                            }
                            return useXDecCurrencyFormat(params.value, decimals)
                        }
                    }
                },
                data: series
            }]
        };

        if (series.length > 0) {
            var myChart = echarts.init(document.getElementById(param1));
            myChart.setOption(option);
        }
        resolve()
    })
}

export function useBoxPlotChart() {
    //console.log("  --> boxPlotChart")
    return new Promise((resolve, reject) => {
        //console.log("totals "+JSON.stringify(filteredTrades))
        var myChart = echarts.init(document.getElementById('boxPlotChart1'));
        var dataArray = []
        var dateArray = []

        var sumSharePL = 0
        var sumTrades = 0
        var weekOfYear = null
        var monthOfYear = null
        var i = 1
        var numOfEl = 0
        filteredTrades.forEach(element => {
            var sharePL = 0
            var tradesLength = element.trades.length
            element.trades.forEach(element => {
                if (selectedTimeFrame.value == "daily") {
                    dataArray.push(element[amountCase.value + 'SharePL'])
                    dateArray.push(useChartFormat(element.dateUnix))
                }

                if (selectedTimeFrame.value == "weekly") {
                    //First value
                    if (weekOfYear == null) {
                        weekOfYear = dayjs.unix(element.dateUnix).isoWeek()
                        sumSharePL += element[amountCase.value + 'SharePL']
                        numOfEl += 1
                        dateArray.push(useChartFormat(element.dateUnix))

                    } else if (weekOfYear == dayjs.unix(element.dateUnix).isoWeek()) { //Must be "else if" or else calculates twice : once when null and then this time.value
                        //console.log("Same week. Week of year: " + weekOfYear)
                        sumSharePL += element[amountCase.value + 'SharePL']
                        numOfEl += 1
                    }
                    if (dayjs.unix(element.dateUnix).isoWeek() != weekOfYear) {
                        //When week changes, we create values proceeds and push both chart datas
                        dataArray.push(sumSharePL / numOfEl)

                        //New week, new proceeds
                        sumSharePL = 0
                        numOfEl = 0

                        weekOfYear = dayjs.unix(element.dateUnix).isoWeek()
                        //console.log("New week. Week of year: " + weekOfYear + " and start of week " + dayjs.unix(element.dateUnix).startOf('isoWeek'))
                        sumSharePL += element[amountCase.value + 'SharePL']
                        numOfEl += 1
                        dateArray.push(useChartFormat(dayjs.unix(element.dateUnix).startOf('isoWeek') / 1000))
                    }
                    if (i == tradesLength) {
                        //Last key. We wrap up.
                        dataArray.push(sumSharePL / numOfEl)
                        //console.log("Last element")
                    }
                }

                if (selectedTimeFrame.value == "monthly") {
                    //First value
                    if (monthOfYear == null) {
                        monthOfYear = dayjs.unix(element.dateUnix).month()
                        sumSharePL += element[amountCase.value + 'Proceeds']
                        chartXAxis.push(useChartFormat(element.dateUnix))

                    }
                    //Same month. Let's continue adding proceeds
                    else if (monthOfYear == dayjs.unix(element.dateUnix).month()) {
                        //console.log("Same week. Week of year: " + monthOfYear)
                        sumSharePL += element[amountCase.value + 'Proceeds']
                    }
                    if (dayjs.unix(element.dateUnix).month() != monthOfYear) {
                        //When week changes, we create values proceeds and push both chart datas
                        proceeds = sumSharePL
                        pushingChartBarData()
                        pushingChartData()

                        //New month, new proceeds
                        sumSharePL = 0
                        monthOfYear = dayjs.unix(element.dateUnix).month()
                        //console.log("New week. Week of year: " + monthOfYear + " and start of week " + dayjs.unix(element.dateUnix).startOf('month'))
                        sumSharePL += element[amountCase.value + 'Proceeds']
                        chartXAxis.push(useChartFormat(dayjs.unix(element.dateUnix).startOf('month') / 1000))
                    }
                    if (i == tradesLength) {
                        //Last key. We wrap up.
                        proceeds = sumSharePL
                        pushingChartBarData()
                        pushingChartData()
                        sumSharePL = 0
                        //console.log("Last element")
                    }
                }
                i++
            });
            //console.log("gross list " + listGrossSharePL)

            //Sorting list



        });
        // specify chart configuration item and data
        const option = {
            dataset: [{
                source: dataArray
            }, {
                transform: {
                    type: 'boxplot',
                    config: {
                        itemNameformatter: (params) => {
                            return dateArray[params.value];
                        }
                    }
                }
            }, {
                fromDatasetIndex: 1,
                fromTransformResult: 1
            }],
            tooltip: {
                trigger: 'item',
                backgroundColor: blackbg7,
                borderColor: blackbg7,
                textStyle: {
                    color: white87.value
                },
                axisPointer: {
                    type: 'shadow'
                },
                formatter: (params) => {
                    if (params.componentIndex == 0) {
                        return 'Maximum: ' + params.value[5].toFixed(2) + '$<br/>' +
                            'Upper quartile: ' + params.value[4].toFixed(2) + '$<br/>' +
                            'Median: ' + params.value[3].toFixed(2) + '$<br/>' +
                            'Lower quartile: ' + params.value[2].toFixed(2) + '$<br/>' +
                            'Minimum: ' + params.value[1].toFixed(2) + '$<br/>'
                    }
                    if (params.componentIndex == 1) {
                        return 'Outlier: ' + params.value[1].toFixed(2) + '$'
                    }
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: true,
                nameGap: 30,
                splitArea: {
                    show: false
                },
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                splitArea: {
                    show: true
                },
                axisLabel: {
                    formatter: (params) => {
                        return params.toFixed(2) + "$"
                    }
                },
            },

            series: [{
                name: 'boxplot',
                type: 'boxplot',
                datasetIndex: 1,
                itemStyle: {
                    borderColor: "#01B4FF"
                },
                emphasis: {
                    label: {
                        show: true
                    }
                },
            },
            {
                name: 'outlier',
                type: 'scatter',
                datasetIndex: 2,
                itemStyle: {
                    color: '#6c757d',
                }
            }
            ]
        };
        myChart.setOption(option);
        resolve()
    })
}

export function useScatterChart(param1) { //chart ID, green, red, page
    //console.log(" param1 " + param1)
    return new Promise((resolve, reject) => {
        //console.log("  --> " + param1)
        //console.log("para 2 " + param2 + " and 3 " + param3)
        let myChart = echarts.init(document.getElementById(param1));
        let dataArray = []

        filteredTrades.forEach(element => {
            //console.log("element "+JSON.stringify(element))
            element.trades.forEach(el => {
                if (param1 == "scatterChart1") {
                    if (el[selectedGrossNet.value + 'Status'] == 'win') {
                        let temp = []
                        //console.log(" -> Win element "+JSON.stringify(el))
                        temp.push(useTimeFormat(el.entryTime))
                        temp.push(el[selectedGrossNet.value + 'SharePLWins'])
                        temp.push(el[selectedGrossNet.value + 'Wins'])
                        temp.push(dayjs(el.entryTime * 1000).tz(timeZoneTrade.value).hour())
                        temp.push(dayjs(el.entryTime * 1000).tz(timeZoneTrade.value).minute())
                        temp.push(dayjs(el.entryTime * 1000).tz(timeZoneTrade.value).second())
                        dataArray.push(temp)
                    }
                }
                if (param1 == "scatterChart2") {
                    if (el[selectedGrossNet.value + 'Status'] == 'loss') {
                        let temp = []
                        //console.log(" -> Win element "+JSON.stringify(el))
                        temp.push(useTimeFormat(el.entryTime))
                        temp.push(el[selectedGrossNet.value + 'SharePLLoss'])
                        temp.push(-el[selectedGrossNet.value + 'Loss'])
                        temp.push(dayjs(el.entryTime * 1000).tz(timeZoneTrade.value).hour())
                        temp.push(dayjs(el.entryTime * 1000).tz(timeZoneTrade.value).minute())
                        temp.push(dayjs(el.entryTime * 1000).tz(timeZoneTrade.value).second())
                        dataArray.push(temp)
                    }
                }


            });
        });
        //console.log("current hour "+)
        //console.log(" -> Data array " + dataArray)

        let sortedArray = dataArray.sort((a, b) => a[5] - b[5]).sort((a, b) => a[4] - b[4]).sort((a, b) => a[3] - b[3])

        //console.log(" -> Sorted array " + sortedArray)

        const option = {
            grid: {
                left: '8%',
                top: '10%'
            },
            xAxis: {
                type: 'category',
            },
            yAxis: {
                type: 'value',
                splitLine: {
                    lineStyle: {
                        type: 'solid',
                        color: cssColor38
                    }
                },
                axisLabel: {
                    formatter: (params) => {
                        return params.toFixed(2)
                    }
                },
            },
            series: {
                data: sortedArray,
                type: 'scatter',
                symbolSize: function (data) {
                    return Math.sqrt(data[2])
                },
                emphasis: {
                    focus: 'series',
                    label: {
                        show: true,
                        formatter: (param) => {
                            return useThousandCurrencyFormat(param.data[2])
                        },
                        position: 'top'
                    }
                },
                itemStyle: {
                    color: '#35C4FE',
                }
            }
        };
        myChart.setOption(option);
        resolve()
    })
}
let candlestickChart
let currentTD

export function useCandlestickChart(ohlcTimestamps, ohlcPrices, ohlcVolumes, trade, initCandleChart) {
    console.log(" -> creating candlestick chart")
    //console.log(" trade " + JSON.stringify(trade))
    let green = '#26a69a'
    let red = '#FF6960'
    let exitMarkerColor
    let entryMarkerColor
    if (trade.strategy == 'long') {
        entryMarkerColor = red
        exitMarkerColor = green
    } else {
        entryMarkerColor = green
        exitMarkerColor = red
    }


    const maxZoomStartUnix = dayjs(trade.entryTime * 1000).tz(timeZoneTrade.value).startOf('day').unix()
    const maxZoomEndUnix = dayjs(trade.exitTime * 1000).tz(timeZoneTrade.value).endOf('day').unix()


    let dataZoomStartUnix
    let dataZoomEndUnix

    const startOfMinute = (param) => {
        return dayjs(param * 1000).tz(timeZoneTrade.value).startOf('minute').unix()
    }

    const endOfMinute = (param) => {
        return dayjs(param * 1000).tz(timeZoneTrade.value).endOf('minute').unix()
    }

    if (dailyChartZoom.value === 1) {
        dataZoomStartUnix = startOfMinute(trade.entryTime)
        dataZoomEndUnix = endOfMinute(trade.exitTime)
    }

    if (dailyChartZoom.value === 2) {
        dataZoomStartUnix = startOfMinute((maxZoomStartUnix - trade.entryTime) / 2)
        dataZoomEndUnix = endOfMinute((maxZoomEndUnix - trade.exitTime) / 2)
    }

    if (dailyChartZoom.value === 3) {
        dataZoomStartUnix = startOfMinute(maxZoomStartUnix)
        dataZoomEndUnix = endOfMinute(maxZoomEndUnix)
    }

    /*
    const initialDataZoomPadding = dayjs(0).minute(dailyChartZoom.value).unix()
    const minimumDataZoomLevel = dayjs.unix(0).tz(timeZoneTrade.value).minute(30).unix() // if trading near start of day, needs to be at least minimumDataZoomLevel
    console.log(" initialDataZoomPadding "+initialDataZoomPadding)
    console.log(" minimumDataZoomLevel "+minimumDataZoomLevel)
    const tradeIsIntraday = dayjs.unix(trade.entryTime).tz(timeZoneTrade.value).isSame(dayjs.unix(trade.exitTime).tz(timeZoneTrade.value), 'day')
    const spreadTime = tradeIsIntraday ? Math.abs(trade.exitTime - trade.entryTime) : 0
    const dataZoomLevel = Math.max(minimumDataZoomLevel, spreadTime + (2 * initialDataZoomPadding))
    console.log(" dataZoomLevel "+dataZoomLevel)

    const findDataZoomStartUnix = () => {
        let dataZoomStartUnix = trade.entryTime - (dataZoomLevel / 2) - (spreadTime / 2)
        console.log("dataZoomStartUnix1 "+dataZoomStartUnix)
        for (let i = ohlcTimestamps.length - 1; i >= 0; i--) {
            const ohlcTimestampUnix = ohlcTimestamps[i] / 1000;
            if (ohlcTimestampUnix <= dataZoomStartUnix) {
                dataZoomStartUnix = ohlcTimestampUnix
                break
            }
        }
        console.log("dataZoomStartUnix2 "+dataZoomStartUnix)
        return dataZoomStartUnix
    }

    const findDataZoomEndUnix = () => {
        let dataZoomEndUnix = trade.exitTime + dataZoomLevel / 2 + spreadTime / 2

        for (let i = 0; i < ohlcTimestamps.length; i++) {
            const ohlcTimestampUnix = ohlcTimestamps[i] / 1000;
            if (ohlcTimestampUnix >= dataZoomEndUnix) {
                dataZoomEndUnix = ohlcTimestampUnix
                break
            }
        }
        console.log(" dataZoomEndUnix "+dataZoomEndUnix)
        return dataZoomEndUnix
    }
    */

    return new Promise((resolve, reject) => {
        //console.log(" currentTD "+currentTD)
        //console.log(" trade.td "+trade.td)
        if (initCandleChart) {
            //console.log(" init new candlestickChart")
            candlestickChart = echarts.init(document.getElementById("candlestickChart"));
            //currentTD = trade.td
        }

        let decimals = 2
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                backgroundColor: "rgba(255, 255, 255, 0)",
                borderColor: "rgba(255, 255, 255, 0)",
                textStyle: {
                    color: "rgba(255, 255, 255, 1)"
                },
                formatter: function (param) {
                    const ohlc = param[0]; // Candlestick
                    const volume = param[1]; // Volume bar

                    const open = ohlc.data[2];
                    const close = ohlc.data[1];
                    const low = ohlc.data[3];
                    const high = ohlc.data[4];
                    const vol = volume.data;

                    const color = close >= open ? "#47b262" : "#eb5454";

                    return `${ohlc.name} - 
                        O <span style='color: ${color}'>${useXDecFormat(open, decimals)}</span> 
                        H <span style='color: ${color}'>${useXDecFormat(high, decimals)}</span> 
                        L <span style='color: ${color}'>${useXDecFormat(low, decimals)}</span> 
                        C <span style='color: ${color}'>${useXDecFormat(close, decimals)}</span> 
                        <br>
                        Volume: <span style='color: ${color}'>${useXDecFormat(vol, 0)}</span>`;
                },
                position: function (pos, params, el, elRect, size) {
                    var obj = { top: 5 };
                    obj[['left'][+(pos[10] < size.viewSize[0] / 2)]] = 5;
                    return obj;
                }
            },
            dataZoom: [
                {
                    type: 'inside',
                    startValue: '',
                    endValue: '',
                    preventDefaultMouseMove: false
                },
            ],
            xAxis: {
                type: 'category',
                data: ohlcTimestamps.map((dateInMilliseconds) => {
                    return useHourMinuteFormat(dateInMilliseconds / 1000)
                }),
                scale: true,
                axisLine: { onZero: false },
                splitLine: { show: false }, 
                min: 'dataMin',
                max: 'dataMax',

            },
            yAxis: [
                {
                    scale: true,
                    min: function (value) {
                        // Add padding below lowest price to leave space for volume bars
                        return value.min - (value.max - value.min) * 0.2;
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: '#333',
                            width: 0.5
                        }
                    }
                },
                {
                    name: 'Volume',
                    scale: true,
                    gridIndex: 0,
                    splitLine: { show: false },
                    axisLabel: {
                        formatter: function (val) {
                            return val > 1e6 ? (val / 1e6).toFixed(1) + 'M' :
                                val > 1e3 ? (val / 1e3).toFixed(1) + 'k' : val;
                        }
                    }
                }
            ],
            series: [
                {
                    type: 'candlestick',
                    data: ohlcPrices,
                    markPoint: {
                        /*label: {
                            formatter: function (param) {
                                return param != null ? Math.round(param.value) + '' : '';
                            }
                        },*/
                        data: [],
                        tooltip: {
                            formatter: function (param) {
                                return param.name + '<br>' + (param.data.coord || '');
                            }
                        }
                    }
                },
                {
                    type: 'bar',
                    name: 'Volume',
                    data: ohlcVolumes,
                    yAxisIndex: 1,
                    itemStyle: {
                        color: function (params) {
                            // Optional: color by price direction
                            const [open, close] = ohlcPrices[params.dataIndex];
                            return close <= open ? '#47b262' : '#eb5454';
                        },
                        opacity: 0.5
                    }
                }
            ]
        };

        if (dayjs.unix(trade.entryTime).tz(timeZoneTrade.value).isSame(dayjs(ohlcTimestamps[0]), 'day')) {
            //console.log(" trade.entryPrice " + trade.entryPrice)
            option.series[0].markPoint.data.push({
                name: 'entryMark',
                symbol: 'path://M17.92,11.62a1,1,0,0,0-.21-.33l-5-5a1,1,0,0,0-1.42,1.42L14.59,11H7a1,1,0,0,0,0,2h7.59l-3.3,3.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0l5-5a1,1,0,0,0,.21-.33A1,1,0,0,0,17.92,11.62Z',
                symbolSize: '17',
                symbolRotate: '0',
                symbolOffset: ['-60%', 0],
                coord: [String(useHourMinuteFormat(trade.entryTime)), trade.entryPrice],
                //value: trade.entryPrice,
                itemStyle: {
                    color: entryMarkerColor,
                    borderColor: '#FFFFFF',
                    borderWidth: '0.5'
                },
                emphasis: {
                    disabled: true
                }
            })

            option.dataZoom[0].startValue = useHourMinuteFormat(dataZoomStartUnix)
        }

        if (dayjs.unix(trade.exitTime).tz(timeZoneTrade.value).isSame(dayjs(ohlcTimestamps[0]), 'day')) {
            option.series[0].markPoint.data.push({
                name: 'exitMark',
                symbol: 'path://M17.92,11.62a1,1,0,0,0-.21-.33l-5-5a1,1,0,0,0-1.42,1.42L14.59,11H7a1,1,0,0,0,0,2h7.59l-3.3,3.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0l5-5a1,1,0,0,0,.21-.33A1,1,0,0,0,17.92,11.62Z',
                symbolSize: '17',
                symbolRotate: '180',
                symbolOffset: ['60%', 0],
                coord: [String(useHourMinuteFormat(trade.exitTime)), trade.exitPrice],
                //value: trade.exitPrice,
                itemStyle: {
                    color: exitMarkerColor,
                    borderColor: '#FFFFFF',
                    borderWidth: '0.5'
                },
                emphasis: {
                    disabled: true
                }
            })

            option.dataZoom[0].endValue = useHourMinuteFormat(dataZoomEndUnix)
        }
        candlestickChart.setOption(option);
        resolve()
    })
}