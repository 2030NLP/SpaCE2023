
// https://2030nlp.github.io/SpaCE2022/

// 基本信息 变量
const APP_NAME = "SpaCE2022";
const APP_VERSION = "22-0524-00";

// 开发环境 和 生产环境 的 控制变量
const DEVELOPING = location?.hostname=="2030nlp.github.io" ? 0 : 1;
if (DEVELOPING) {
  console.log("DEVELOPING");
} else {
  console.log("PRODUCTION");
};
const DEVELOPING_LOCAL = 0;
const API_BASE_DEV_LOCAL = "http://127.0.0.1:5000";
const DEV_HOSTS = ["http://192.168.124.5:8888", "http://192.168.1.100:8888", "http://10.1.108.200:8888/", "http://10.0.55.176:8888/", "http://10.1.124.56:8888/"];
const API_BASE_DEV = DEV_HOSTS[0];
const API_BASE_PROD = "https://www.lmxiao.cn";
const API_BASE = DEVELOPING ? API_BASE_DEV : API_BASE_PROD;

const BaseURL = `${API_BASE}/api/`;

// 引入依赖的模块

import {
  reactive,
  // readonly,
  // ref,
  // toRef,
  toRefs,
  computed,
  onMounted,
  onUpdated,
  createApp as Vue_createApp,
  watch,
  // h,
} from './modules_lib/vue_3.2.31_.esm-browser.prod.min.js';
import axios from './modules_lib/axios_0.26.1_.mjs.js';


const RootComponent = {
  setup() {

    const v = it => it;//?.value;

    // 一个 axios 实例，方便在控制台调试
    const anAxios = axios.create({
      headers: {'Cache-Cotrol': 'no-cache'},
    });

    onMounted(async()=>{
      await get_all_teams();
    });

    const get_all_teams = async () => {
      const resp = await anAxios.get("https://sp22.nlpsun.cn/api/eval-register");
      // console.log(resp);
      if (resp?.data?.code==200) {
        localData.all_teams = resp?.data?.data ?? [];
      };
    };

    const localData = reactive({
      "ui": {
        // current_page: 'temporary',
        modal_open: 0,
        modal_type: 'G',
        nav_collapsed: 1,
        alerts_last_idx: 1,
        alerts: [],
      },
      "submission_succeeded": false,
      "form": {
        team_name: "",
        team_type: "【请选择】",
        institution: "",
        people: "",
        phone: "",
        email: "",
        agree: false,
        // institution2: "",
        // group: "",
        // leader: "",
        // card_id: "",
        // card_type: "身份证",
      },
      "history": [],
      "all_teams": [],
      "qr": null,
      //
      "user_agent": navigator.userAgent,
      //
    });

    watch(()=>localData.form?.people, ()=>{
      localData.form.leader = localData.form?.people?.split?.(/ *, *| *， */)?.[0];
    });

    const check_team_name = computed(() => {
      return localData.form?.team_name?.length && localData.form?.team_name.length <= 10;
    });
    const check_institution = computed(() => {
      return localData.form?.institution?.length;
    });
    const check_people = computed(() => {
      return localData.form?.people.length && localData.form?.people.split(/ *, *| *， */).length <= 10;
    });
    const check_phone = computed(() => {
      let x = localData.form?.phone.match(/\d{11}/);
      return x && x[0] == localData.form?.phone;
    });
    const check_email = computed(() => {
      let x = localData.form?.email.match(/[^ ]+@[^ ]+\.[^ ]+/);
      return x && x[0] == localData.form?.email;
    });
    const check_team_type = computed(() => {
      return localData.form?.team_type && localData.form?.team_type != "【请选择】";
    });
    const check_leader = computed(() => {
      return localData.form?.leader;
    });
    const check_card_id = computed(() => {
      return localData.form?.card_id;
    });
    const check_card_type = computed(() => {
      return localData.form?.card_type;
    });

    const check_all = computed(() => {
      return check_team_name.value &&
      check_institution.value &&
      check_people.value &&
      check_phone.value &&
      check_email.value &&
      // check_team_type.value &&
      // check_leader.value &&
      // check_card_id.value &&
      // check_card_type.value &&
      localData.form?.agree;
    });

    const check_if_team_name_existed = async () => {
      return false;
    };

    const doSubmit = async (form) => {
      const resp = await anAxios.request({
        baseURL: BaseURL,
        headers: {'Cache-Cotrol': 'no-cache'},
        method: "post",
        url: `/eval-register`,
        timeout: 30000,
        data: form,
      });
      return resp.data;
    };

    const submitForm = async () => {
      try {
        let idx = push_alert('正在提交，请稍等……', 'info');
        let result = await doSubmit(localData.form);
        remove_alert(idx);
        if (result?.code==200) {
          push_alert('提交成功！', 'success');
          localData.submission_succeeded = true;
          localData.history.push(result?.data);
        } else {
          push_alert(`提交时出现问题（${result?.code} : ${result?.msg}），请稍后重试，或与工作人员联系。`, 'danger', 30000);
        };
      } catch(error) {
        console.log(error);
        push_alert(`提交时出现故障（${error}），请稍后重试，或与工作人员联系。`, 'danger', 30000);
      };
      await get_all_teams();
    };

    const submitIt = async () => {
      console.log(localData.form);
      let shouldSubmit = false;
      // let team_name_existed = await check_if_team_name_existed();
      // if (team_name_existed) {
      //   push_alert('队名已经被别人使用，请重新取一个队名吧！', 'danger');
      //   localData.form?.team_name = "";
      //   return;
      // };
      await submitForm();
    };

    const reset = () => {
      localData.submission_succeeded = false;
      localData.form = {
        team_name: "",
        team_type: "【请选择】",
        institution: "",
        people: "",
        phone: "",
        email: "",
        agree: false,
        // institution2: "",
        // group: "",
        // leader: "",
        // card_id: "",
        // card_type: "身份证",
      };
    };

    const toggle_modal = (type) => {
      localData.ui.modal_type = type;
      localData.ui.modal_open = 1 - localData.ui.modal_open;
    };
    const push_alert = (ctt, cls="info", tttt=3000) => {
      console.log([ctt, cls, tttt]);
      let idx = localData.ui.alerts_last_idx+1;
      localData.ui.alerts.push({
        'idx': idx,
        'style': cls,
        'html': ctt,
        'show': 1,
      });
      localData.ui.alerts_last_idx += 1;
      setTimeout(function(){remove_alert(idx);},tttt);
      return idx;
    };
    const remove_alert = (idx) => {
      localData.ui.alerts.filter(alert => alert.idx==idx)[0].show = 0;
    };



    const readDataFromLocalStorage = () => {
      if (window.localStorage['form']) {
        localData.form = JSON.parse(window.localStorage['form']);
      };
      if (window.localStorage['submission_succeeded']) {
        localData.submission_succeeded = JSON.parse(window.localStorage['submission_succeeded']);
      };
      if (window.localStorage['history']) {
        localData.history = JSON.parse(window.localStorage['history']);
      };
    };

    const saveDataToLocalStorage = () => {
      if (window.localStorage) {
        window.localStorage['form'] = JSON.stringify(localData.form);
        window.localStorage['submission_succeeded'] = JSON.stringify(localData.submission_succeeded);
        window.localStorage['history'] = JSON.stringify(localData.history);
      };
    };

    onMounted(() => {
      readDataFromLocalStorage();
    });

    onUpdated(() => {
      saveDataToLocalStorage();
    });






    return {
      //
      v,
      //
      // util
      axios,
      anAxios,
      //
      // data
      ...toRefs(localData),
      //
      // computed
      check_all,
      check_team_name,
      check_team_type,
      check_institution,
      check_people,
      check_leader,
      check_card_id,
      check_card_type,
      check_phone,
      check_email,
      //
      // methods
      submitIt,
      reset,
      toggle_modal,
      push_alert,
      remove_alert,
      //
      readDataFromLocalStorage,
      saveDataToLocalStorage,
      //
    };
  },
};

const the_app = Vue_createApp(RootComponent);

const app = the_app.mount('#bodywrap');
window.app = app;

export default app;
