<script setup>
import { onBeforeMount, onMounted, reactive, ref } from 'vue';
import { useCheckCurrentUser, useInitTooltip, useGetAPIS, useGetLayoutStyle, useExport } from '../utils/utils';
import { currentUser, renderProfile, availableTags, apis, layoutStyle } from '../stores/globals';
import { useGetAvailableTags } from '../utils/daily';

/* MODULES */
import Parse from 'parse/dist/parse.min.js'
import Sortable from 'sortablejs';

let profileAvatar = null
let polygonKey = null
let databentoKey = null
let ibkrHost = null

const newAvailableTags = reactive([])
const availableTagsTags = reactive([])

let groupToDelete = ref(null)
let tagToDelete = ref(null)

let inputCount = ref(null)

onBeforeMount(async () => {
    await useGetAvailableTags()
    useGetAvailableTagsTags()
    await useGetAPIS()
    //await useGetLayoutStyle()
    //newAvailableTags = JSON.parse(JSON.stringify(availableTags)) //JSON.parse(JSON.stringify avoids the two arrays to be linked !!
    //console.log(" available tags " + JSON.stringify(availableTags))
    //console.log(" availableTagsTags "+JSON.stringify(availableTagsTags))
    for (let index = 0; index < availableTags.length; index++) {
        const element = JSON.parse(JSON.stringify(availableTags[index]))
        newAvailableTags.push(element)
    }
    //console.log(" newAvailableTags "+JSON.stringify(newAvailableTags))
    initSortable()


})

onMounted(async () => {
    await useInitTooltip()
})

/* PROFILE */
async function uploadProfileAvatar(event) {
    const file = event.target.files[0];
    profileAvatar = file
}


async function updateProfile() {
    console.log(" update profile")
    return new Promise(async (resolve, reject) => {
        console.log("\nUPDATING PROFILE")

        const parseObject = Parse.Object.extend("_User");
        const query = new Parse.Query(parseObject);
        query.equalTo("objectId", currentUser.value.objectId);
        const results = await query.first();
        if (results) {
            if (profileAvatar != null) {
                const parseFile = new Parse.File("avatar", profileAvatar);
                results.set("avatar", parseFile)
            }
            await results.save().then(async () => { //very important to have await or else too quick to update
                await useCheckCurrentUser()
                await (renderProfile.value += 1)
                console.log(" -> Profile updated")
            })
            //
        } else {
            alert("Update query did not return any results")
        }

        resolve()
    })
}

/*********************
 * TAGS
 *********************/

const useGetAvailableTagsTags = () => {
    availableTagsTags.splice(0)
    for (let index = 0; index < availableTags.length; index++) {
        const element = availableTags[index];
        for (let index = 0; index < element.tags.length; index++) {
            const el = element.tags[index];
            el.groupName = element.name
            availableTagsTags.push(el)
        }

    }
}

const useGetNewAvailableTags = () => {
    newAvailableTags.splice(0)
    for (let index = 0; index < availableTags.length; index++) {
        const element = availableTags[index];
        newAvailableTags.push(element)
    }
}
const initSortable = (param1) => {
    let idDivElToCreate

    for (let index = 0; index < availableTags.length; index++) {
        const element = availableTags[index];

        idDivElToCreate = document.getElementById(element.id)
        if (idDivElToCreate != null) {
            Sortable.create(idDivElToCreate, {
                group: {
                    name: "common",
                },
                animation: 100,
                onEnd: function ( /**Event*/ evt) {
                    let itemEl = evt.item; // dragged HTMLElement
                    let tagName = itemEl.querySelector('input').value
                    let tagId = itemEl.querySelector('input').id

                    let oldListId = evt.from.id
                    let newListId = evt.to.id
                    let oldIndex = evt.oldIndex
                    let newIndex = evt.newIndex

                    let oldListIndex = newAvailableTags.findIndex(obj => obj.id == oldListId)
                    let newListIndex = newAvailableTags.findIndex(obj => obj.id == newListId)

                    //console.log(" -> Tag " + tagName + " dragged from list " + oldListId + " on index " + oldIndex + " to list " + newListId + " on position " + newIndex)

                    //remove from old list
                    newAvailableTags[oldListIndex].tags.splice(oldIndex, 1)

                    //add to new new list
                    let temp = {}
                    temp.id = tagId
                    temp.name = tagName
                    newAvailableTags[newListIndex].tags.splice(newIndex, 0, temp)

                    //console.log(" -> New available tags " + JSON.stringify(newAvailableTags))
                    //console.log(" -> available tags " + JSON.stringify(availableTags))
                }


            });
        }
    }


}


const addNewGroup = async () => {
    let temp = {}
    const addToAvailableTags = async () => {
        return new Promise(async (resolve, reject) => {
            //console.log(" newAvailableTags " + JSON.stringify(newAvailableTags))

            if (newAvailableTags.length > 0) {
                const highestId = newAvailableTags.reduce((max, obj) => Math.max(max, parseInt(obj.id.replace("group_", ""), 10)), -Infinity);

                const getRandomHexColor = () => {
                    const red = Math.floor(Math.random() * 256);
                    const green = Math.floor(Math.random() * 256);
                    const blue = Math.floor(Math.random() * 256);
                    const hexColor = '#' + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1);
                    return hexColor;
                }
                temp.id = "group_" + (highestId + 1).toString()
                temp.name = "GroupName"
                temp.color = getRandomHexColor()
                temp.tags = []
            }
            else {
                temp.id = "group_0"
                temp.name = "Ungrouped"
                temp.color = "#6c757d"
                temp.tags = []
            }
            newAvailableTags.push(temp)

            resolve()
        })
    }

    await addToAvailableTags()
    await updateSortedTags()
}

const addNewTag = async () => {
    let temp = {}
    const addToAvailableTags = async () => {
        return new Promise(async (resolve, reject) => {
            const findHighestIdNumber = (param) => {
                let highestId = -Infinity;
                //console.log("  -> Find highest number amongst " + JSON.stringify(param))
                param.forEach(innerArray => {
                    //console.log(" innerArray.tags " + JSON.stringify(innerArray.tags))
                    if (innerArray.tags.length == 0 && highestId == -Infinity) {
                        highestId = 0
                    } else {
                        innerArray.tags.forEach(obj => {
                            if (Number(obj.id.replace("tag_", "")) > highestId) {
                                highestId = Number(obj.id.replace("tag_", ""))
                            }
                        });
                    }
                });
                return highestId;
            }

            // Get the highest id number
            const highestIdNumber = findHighestIdNumber(newAvailableTags);
            console.log("  --> Highest number " + highestIdNumber);

            temp.id = "tag_" + (highestIdNumber + 1).toString()
            temp.name = "TagName"

            let ungroupedIndex = newAvailableTags.findIndex(obj => obj.id == 'group_0')
            newAvailableTags[ungroupedIndex].tags.push(temp)
            resolve()
        })
    }

    await addToAvailableTags()
    await updateSortedTags()
}

const deleteGroup = async () => {
    //first we move all the tags to the ungrouped group
    console.log(" -> Group to delete " + groupToDelete.value)
    if (groupToDelete.value !== null) {
        let toDeleteIndex = newAvailableTags.findIndex(obj => obj.id == groupToDelete.value)

        const moveTags = async () => {
            return new Promise(async (resolve, reject) => {
                //console.log(" newAvailableTags[toDeleteIndex].tags "+JSON.stringify(newAvailableTags[toDeleteIndex]))
                //console.log(" newAvailableTags[0].tags "+JSON.stringify(newAvailableTags[0]))

                //Case where group has no tags
                if (newAvailableTags[toDeleteIndex].tags.length == 0) {
                    resolve()
                }

                else {
                    for (let index = 0; index < newAvailableTags[toDeleteIndex].tags.length; index++) {
                        const element = newAvailableTags[toDeleteIndex].tags[index];
                        newAvailableTags[0].tags.push(element)
                        if ((index + 1) == newAvailableTags[toDeleteIndex].tags.length) {
                            resolve()
                        }
                    }
                }
            })
        }
        const spliceArrays = async () => {
            return new Promise(async (resolve, reject) => {
                newAvailableTags.splice(toDeleteIndex, 1)
                resolve()
            })
        }
        await moveTags()
        await spliceArrays()
        groupToDelete.value = null
        //console.log(" -> newAvailableTags " + JSON.stringify(newAvailableTags))
        await updateSortedTags()
    }
}

const deleteTag = async () => {
    console.log("\DELETING TAGS")
    console.log(" -> Tag to delete " + tagToDelete.value)

    if (tagToDelete.value !== null) {

        const deleteTagFromAvailableTags = async () => {
            return new Promise(async (resolve, reject) => {
                console.log("\DELETING FROM AVAILABLE TAGS")
                const parseObject = Parse.Object.extend("_User");
                const query = new Parse.Query(parseObject);
                query.equalTo("objectId", currentUser.value.objectId);
                const results = await query.first();
                if (results) {
                    //console.log(" results "+JSON.stringify(JSON.parse(JSON.stringify(results)).tags))
                    const userTags = JSON.parse(JSON.stringify(results)).tags
                    const findTagToDelete = () => {
                        for (let index = 0; index < userTags.length; index++) {
                            const element = userTags[index];
                            //console.log(" element "+JSON.stringify(element))
                            let tagIndex = element.tags.findIndex(obj => obj.id === tagToDelete.value)
                            if (tagIndex != -1) {
                                element.tags.splice(tagIndex, 1)
                                return
                            }

                        }
                    }

                    findTagToDelete()
                    //console.log(" -> userTags after deletion "+JSON.stringify(userTags))

                    results.set("tags", userTags)
                    await results.save().then(async () => {
                        console.log(" -> Deleted tag from available tags")
                        resolve()
                    })
                } else {
                    alert("Update query did not return any results")
                }
            })
        }

        const deleteTagFromTrades = async () => {
            return new Promise(async (resolve, reject) => {
                const parseObject = Parse.Object.extend("tags");
                const query = new Parse.Query(parseObject);
                const results = await query.find();
                if (results.length > 0) {
                    for (let i = 0; i < results.length; i++) {
                        const object = results[i];
                        const tradeTags = object.get('tags')
                        let tagIndex = tradeTags.findIndex(obj => obj == tagToDelete.value)
                        if (tagIndex != -1) {
                            tradeTags.splice(tagIndex, 1)
                            object.set("tags", tradeTags)
                            await object.save().then(async () => {
                                console.log("   ---> Deleted tag from trades")
                            })
                        }
                        //console.log(" -> TradeTags " + JSON.stringify(tradeTags))
                    }
                    resolve()
                } else {
                    console.log(" -> No existing trade tags to update")
                    resolve()
                }
            })
        }

        await deleteTagFromAvailableTags()
        await deleteTagFromTrades()
        await useGetAvailableTags()
        useGetAvailableTagsTags()
        useGetNewAvailableTags()
        initSortable()

    }

}

const inputGroupName = (param1, param2) => {
    newAvailableTags[param1].name = param2
    //console.log(" newAvailableTags " + JSON.stringify(newAvailableTags))
}

const inputGroupColor = (param1, param2) => {
    newAvailableTags[param1].color = param2
    //console.log(" newAvailableTags " + JSON.stringify(newAvailableTags))
}


const inputGroupTag = (param1, param2) => { //groupIndex, tag.id, value
    //console.log(" param 1 " + param1)
    //console.log(" param 2 " + param2)
    let groupIndex = -1;

    newAvailableTags.some((group, index) => {
        if (group.tags.some(tag => tag.id === param1)) {
            groupIndex = index;
            return true; // Stop iteration
        }
    });

    //console.log(groupIndex);

    let tagIndex = newAvailableTags[groupIndex].tags.findIndex(obj => obj.id == param1)

    //remove from old list
    newAvailableTags[groupIndex].tags.splice(tagIndex, 1)

    //add to new new list
    let temp = {}
    temp.id = param1
    temp.name = param2
    newAvailableTags[groupIndex].tags.splice(tagIndex, 0, temp)
}
const updateSortedTags = async () => {
    return new Promise(async (resolve, reject) => {
        console.log("\nUPDATING AVAILABLE TAGS")
        const parseObject = Parse.Object.extend("_User");
        const query = new Parse.Query(parseObject);
        const results = await query.first();
        if (results) {
            results.set("tags", newAvailableTags)
            await results.save().then(async () => {
                console.log(" -> Updated sorted tags")
                await useGetAvailableTags()
                useGetAvailableTagsTags()
                initSortable()
                resolve()
            })
        } else {
            alert("Update query did not return any results")
        }
    })
}

/*********************
 * APIS
 *********************/
const generateAPIKey = () => {
    console.log(" generating ")
    //create a base-36 string that contains 30 chars in a-z,0-9
    let apiKey = [...Array(30)]
        .map((e) => ((Math.random() * 36) | 0).toString(36))
        .join('');

    let index = apis.findIndex(obj => obj.provider === "tradeNote")
    if (index != -1) {
        apis[index].key = apiKey
    } else {
        let temp = {}
        temp.provider = "tradeNote"
        temp.label = "TradeNote"
        temp.key = apiKey
        apis.push(temp)
    }
    //console.log(" APIS " + JSON.stringify(apis))
}

/*********************
 * LAYOUT & SETUP
 *********************/
const inputDiaryTitles = (param1, param2) => {
    console.log(" param 1 " + param1)
    console.log(" param 2 " + param2)
    if (layoutStyle.diaryTitles != undefined && layoutStyle.diaryTitles.length > 0) {
        console.log("title exists")
        layoutStyle.diaryTitles.splice(param1, 0, param2);
        console.log(" Layout Style " + JSON.stringify(layoutStyle.diaryTitles))
    } else {
        console.log("title does not exists")
        layoutStyle.diaryTitles = []
        layoutStyle.diaryTitles.splice(param1, 0, param2);
        console.log(" Layout Style " + JSON.stringify(layoutStyle))
    }


}
const updateAPIS = async () => {
    return new Promise(async (resolve, reject) => {
        console.log("\nUPDATING APIS")
        console.log(" apis " + JSON.stringify(apis))
        const parseObject = Parse.Object.extend("_User");
        const query = new Parse.Query(parseObject);
        const results = await query.first();
        if (results) {
            if (polygonKey != null) {
                let index = apis.findIndex(obj => obj.provider === "polygon")
                if (index != -1) {
                    apis[index].key = polygonKey
                } else {
                    let temp = {}
                    temp.provider = "polygon"
                    temp.label = "Polygon"
                    temp.key = polygonKey
                    apis.push(temp)
                }
            }

            if (databentoKey != null) {
                let index = apis.findIndex(obj => obj.provider === "databento")
                if (index != -1) {
                    apis[index].key = databentoKey
                } else {
                    let temp = {}
                    temp.provider = "databento"
                    temp.label = "Databento"
                    temp.key = databentoKey
                    apis.push(temp)
                }
            }

            // TODO: comprobar esto
            if(ibkrHost != null){
                let index = apis.findIndex(obj => obj.provider === "ibkr")
                if (index != -1){
                    apis[index].key = ibkrHost
                }
                else {
                    let temp = {}
                    temp.provider = "ibkr"
                    temp.label = "IBKR"
                    temp.key = ibkrHost
                    apis.push(temp)
                }
            }

            results.set("apis", apis)
            console.log(" apis " + JSON.stringify(apis))
            await results.save().then(async () => {
                console.log(" -> Updated apis")
                await useGetAPIS()
                resolve()
            })
        } else {
            alert("Update query did not return any results")
        }
    })
}

</script>

<template>
    <div class="row mt-2">
        <div class="row justify-content-md-center">
            <div class="col-12 col-md-8">
                <!--=============== Layout & Style ===============-->

                <div class="row align-items-center">
                    <p class="fs-5 fw-bold">Layout & Style</p>

                    <!-- Prfile Picture -->
                    <div class="col-12 col-md-4">
                        Profile Picture
                    </div>
                    <div class="col-12 col-md-8">
                        <input type="file" @change="uploadProfileAvatar" />
                    </div>
                </div>

                <div class="mt-3 mb-3">
                    <button type="button" v-on:click="updateProfile" class="btn btn-success">Save</button>
                </div>

                <hr />

                <!--=============== API KEY ===============-->
                <div class="mt-3 row align-items-center">
                    <p class="fs-5 fw-bold">API Keys</p>
                    <div class="row">
                        <div class="col-12 col-md-4">TradeNote<i class="ps-1 uil uil-info-circle"
                                data-bs-toggle="tooltip"
                                data-bs-title="Your TradeNote API Key for using the TradeNote APIs."></i>
                        </div>
                        <div class="col-12 col-md-8">
                            <div class="row">
                                <div class="col-10">
                                    <input type="text" class="form-control"
                                        :value="apis.filter(obj => obj.provider === 'tradeNote').length > 0 && apis.filter(obj => obj.provider === 'tradeNote')[0].key ? apis.filter(obj => obj.provider === 'tradeNote')[0].key : ''"
                                        disabled />
                                </div>
                                <div class="col-2">
                                    <button type="button" v-on:click="generateAPIKey" class="btn btn-outline-light"><i
                                            class="uil uil-redo"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row mt-2">
                        <div class="col-12 col-md-4">Polygon<i class="ps-1 uil uil-info-circle" data-bs-toggle="tooltip"
                                data-bs-title="Your Polygon API Key will be used to fill out automatically MFE prices when you add new trades as well as provide you with charts for your trades on daily page. Works with stocks and options."></i>
                        </div>
                        <div class="col-12 col-md-8">
                            <input type="text" class="form-control"
                                :value="apis.filter(obj => obj.provider === 'polygon').length > 0 && apis.filter(obj => obj.provider === 'polygon')[0].key ? apis.filter(obj => obj.provider === 'polygon')[0].key : ''"
                                @input="polygonKey = $event.target.value" />
                        </div>
                    </div>

                    <div class="row mt-2">
                        <div class="col-12 col-md-4">Databento<i class="ps-1 uil uil-info-circle"
                                data-bs-toggle="tooltip"
                                data-bs-title="Your Datanento API Key will be used to fill out automatically MFE prices when you add new trades as well as provide you with charts for your trades on daily page. Works with Futures."></i>
                        </div>
                        <div class="col-12 col-md-8">
                            <input type="text" class="form-control"
                                :value="apis.filter(obj => obj.provider === 'databento').length > 0 && apis.filter(obj => obj.provider === 'databento')[0].key ? apis.filter(obj => obj.provider === 'databento')[0].key : ''"
                                @input="databentoKey = $event.target.value" />
                        </div>
                    </div>

                    <div class="row mt-2">
                        <div class="col-12 col-md-4">Interactive Brokers API<i class="ps-1 uil uil-info-circle"
                                data-bs-toggle="tooltip"
                                data-bs-title="Your Interactive Brokers Host will be used to fill out automatically MFE prices when you add new trades as well as provide you with charts for your trades on daily page. Make sure you have configured your TWS API and the port (e.g. http://localhost:7497/)"></i>
                        </div>
                        <div class="col-12 col-md-8">
                            <input type="text" class="form-control"
                                :value="apis.filter(obj => obj.provider === 'ibkr').length > 0 && apis.filter(obj => obj.provider === 'ibkr')[0].key ? apis.filter(obj => obj.provider === 'ibkr')[0].key : ''"
                                @input="ibkrHost = $event.target.value" />
                        </div>
                    </div>

                </div>

                <div class="mt-3 mb-3">
                    <button type="button" v-on:click="updateAPIS" class="btn btn-success">Save</button>
                </div>


                <hr />

                <!--=============== TAGS ===============-->
                <div class="mt-3 row">
                    <p class="fs-5 fw-bold">TAGS</p>
                    <p class="fw-lighter">Create tag groups and assign tags to your groups.</p>
                    <div class="row">
                        <div class="col-6">
                            <button type="button" v-on:click="addNewGroup" class="btn blueBtn btn-sm"><i
                                    class="uil uil-plus me-2"></i>Group</button>
                            <button v-show="newAvailableTags.length > 0" type="button" v-on:click="addNewTag"
                                class="btn blueBtn btn-sm ms-3"><i class="uil uil-plus me-2"></i>Tag</button>
                        </div>
                        <div class="col-6 text-end">
                            <button class="btn btn-secondary btn-sm mt-2 ms-4 dropdown-toggle" type="button"
                                data-bs-toggle="dropdown" aria-expanded="false">Export
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item"
                                        v-on:click="useExport('json', 'tags', null, availableTagsTags)">JSON</a>
                                </li>
                                <li><a class="dropdown-item"
                                        v-on:click="useExport('csv', 'tags', null, availableTagsTags)">CSV</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div v-for="(group, groupIndex) in availableTags" class="col-12 col-md-6">
                        <div class="availableTagsCard mt-3">
                            <div class="row align-items-center">
                                <div class="col-6">
                                    <h5 v-if="group.id == 'group_0'">{{ group.name }}</h5>
                                    <h5 v-else><input type="text" class="groupInput"
                                            v-on:input="inputGroupName(groupIndex, $event.target.value)"
                                            :value="group.name">
                                    </h5>
                                </div>
                                <div class="col-6 text-end">
                                    <input type="color" id="colorPicker" class=""
                                        v-on:input="inputGroupColor(groupIndex, $event.target.value)"
                                        :value="group.color">
                                </div>
                            </div>
                            <div class="availableTagsCardInputs" :id="group.id">
                                <div v-for="tag in group.tags">
                                    <input type="text" :style="{ backgroundColor: group.color }" class="availableTags"
                                        v-on:input="inputGroupTag(tag.id, $event.target.value)" :id="tag.id"
                                        :value="tag.name">
                                    <i class="uil uil-draggabledots"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-3 mb-3">
                    <button type="button" v-on:click="updateSortedTags" class="btn btn-success">Save</button>
                </div>

                <!-- Delete Group -->
                <div class="mt-5 row align-items-center">
                    <div class="col-12 col-md-4">
                        Group to delete<i class="ps-1 uil uil-info-circle" data-bs-toggle="tooltip"
                            data-bs-title="Tags will be moved to Ungrouped."></i>
                    </div>
                    <div class="col-12 col-md-8">
                        <select v-on:input="groupToDelete = $event.target.value" class="form-select">
                            <option selected></option>
                            <option v-for="item in availableTags.filter(obj => obj.id !== 'group_0')" :key="item.id"
                                :value="item.id">{{ item.name }}
                            </option>
                        </select>
                    </div>
                </div>
                <div class="mt-3 mb-3">
                    <button type="button" v-on:click="deleteGroup" class="btn btn-danger">Delete</button>
                </div>

                <!-- Delete Tag -->
                <div class="mt-5 row align-items-center">
                    <div class="col-12 col-md-4">
                        Tag to delete
                    </div>
                    <div class="col-12 col-md-8">

                        <select v-on:input="tagToDelete = $event.target.value" class="form-select">
                            <option selected></option>
                            <option v-for="tag in availableTagsTags" :key="tag.id" :value="tag.id">
                                {{ tag.name }}
                            </option>
                        </select>

                    </div>
                </div>
                <div class="mt-3 mb-3">
                    <button type="button" v-on:click="deleteTag" class="btn btn-danger">Delete</button>
                </div>

            </div>
        </div>

    </div>
</template>