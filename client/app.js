(function(global){

    const serverUrl = 'http://127.0.0.1:2080/api';

    const loadTmpl = id => document.getElementById(id+"_tmpl").innerHTML
    const pad = (num, n) => (Array(n).join(0) + num).slice(-n)
    const convertDuration = duration => {
        const h = Math.floor(duration / 3600)
        const m = Math.floor(duration % 3600 / 60)
        const s = Math.floor(duration % 60)
        return h ? `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}` : `${pad(m, 2)}:${pad(s, 2)}`
    }
    const orderNumberFilter = val =>  ('000'+(val+1)).substr(-3)

    Vue.filter('convertDuration', convertDuration)
    Vue.filter('orderNumberFilter', orderNumberFilter)

    /**
     * 首页组件
     * @type {Object}
     */
    const Home = {
        template:loadTmpl('home')
    }

    /**
     * 歌曲列表组件
     * @type {Object}
     */
    const List = {
        template:loadTmpl("list"),
        data:function(){
            this.$http.jsonp(`${serverUrl}/music`).then(res=>
                this.list=res.data
            )
            return {list:[]}
        }
    }

   /**
   * 播放器组件
   * @type {Object}
   */
  const Player = {
        template: loadTmpl('item'),
        data() {
            return {
                item: {},
                model:1,
                lrcArr:[],
                lrc_prev:'',
                lrc_curr:'',
                lrc_next:''
            }
        },
        created () {
        // 组件创建完后获取数据，
        // 此时 data 已经被 observed 了
        this.fetchData()
        },
        watch: {
            '$route' (to, from) {
              // 对路由变化作出响应...
                if(to.name=='item')
                    this.fetchData()
            }
        },
        methods: {
          //获取数据
          fetchData() {
            const id = this.$route.params.id
            if (!id) return router.push({ name: 'list' })


            this.$http.jsonp(`${serverUrl}/music/${id}`).then(res => {
                this.item = { currentTime: 0, playing: false, random: false }
                Object.assign(this.item, res.data)
                App.audio.src = this.item.music
                App.audio.autoplay = true
                App.audio.addEventListener('loadedmetadata', () => {
                  this.item.duration = App.audio.duration
                })
                App.audio.addEventListener('timeupdate', () => {
                  this.item.currentTime = App.audio.currentTime
                  this.syncLRC();
                  if(App.audio.currentTime>=App.audio.duration) App.audio.load()
                })
                App.audio.addEventListener('play', () => {
                  this.item.playing = true
                })
                App.audio.addEventListener('pause', () => {
                  this.item.playing = false
                })

                this.parseLRC()
                this.syncLRC()
              })
              //.catch(error => router.push({ name: 'list' }))
            return { item: {} }
          },
          //播放
          play() {
            if (this.item.playing) {
              App.audio.pause()
            } else {
              App.audio.play()
            }
            this.item.playing = !this.item.playing
          },
          //进度控制
          progress() {
            App.audio.currentTime = this.item.currentTime
          },
          //上一首
          prev() {
            this.$http.jsonp(`${serverUrl}/music`).then(res => {
              const ids = res.data.map(s => s.id)
              let targetIndex = ids.indexOf(this.item.id) - 1
              if (targetIndex < 0) {
                targetIndex = ids.length - 1
              }
              router.push({ name: 'item', params: { id: ids[targetIndex] } })
            })
          },
          //下一首
          next() {
            this.$http.jsonp(`${serverUrl}/music`).then(res => {
              const ids = res.data.map(s => s.id)
              let targetIndex = ids.indexOf(this.item.id) + 1
              if (targetIndex >= ids.length) {
                targetIndex = 0
              }
              router.push({ name: 'item', params: { id: ids[targetIndex] } })
            })
          },
          //歌词同步
          syncLRC(){
            var lrcArr=this.lrcArr, currentTime=this.item.currentTime;
            for(var i=0;i<lrcArr.length;i++){
                if(lrcArr[i][0]>=currentTime){
                    this.lrc_prev=i<2?'•••':lrcArr[i-2][1]
                    this.lrc_curr=i<1?'•••':lrcArr[i-1][1]
                    this.lrc_next=lrcArr[i][1]
                    break
                }
            }
          },
          //歌词解析
          parseLRC() {
                const lyrics = this.item.lyric_content.split("\n");
                var lrcArr = [];
                for(var i=0;i<lyrics.length;i++){
                    var lyric = decodeURIComponent(lyrics[i]);
                    var timeReg = /\[\d*:\d*((\.|\:)\d*)*\]/g;
                    var timeRegExpArr = lyric.match(timeReg);
                    if(!timeRegExpArr)continue;
                    var clause = lyric.replace(timeReg,'');
                    for(var k = 0,h = timeRegExpArr.length;k < h;k++) {
                        var t = timeRegExpArr[k];
                        var min = Number(String(t.match(/\[\d*/i)).slice(1)),
                            sec = Number(String(t.match(/\:\d*/i)).slice(1));
                        var time = min * 60 + sec;
                        lrcArr.push([time,clause]);
                    }
                }
                this.lrcArr= lrcArr;
            }
        },
      }

    //路由
    const router = new VueRouter({
        routes:[
            {path:"/home", name:"home", component:Home},
            {path:"/songs", name:"list", component:List},
            {path:"/songs/:id", name:"item", component:Player},
            {path:"*",component:Home}
        ]
    });

    const App = new Vue({
        router
    }).$mount("#app");

    App.audio = new Audio()

})(this)