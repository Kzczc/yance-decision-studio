(function (global) {
  'use strict';
  const rows = [32, 154, 228, 316, 420];
  const maps = [
    {id:'public-plaza',module:'public',name:'市民服务广场',summary:'中央广场 · 服务大厅 · 花园',pattern:'grid',river:true,legacy:true,features:['服务大厅','共享花园','流动服务点']},
    {id:'public-neighborhood',module:'public',name:'社区生活圈',summary:'住宅巷道 · 社区站 · 活动庭院',pattern:'alleys',xs:[32,190,352,480,672,792],ys:[32,168,228,322,420],primary:[540,156],features:['社区服务站','邻里庭院','无障碍通道'],buildings:[[0,64,62,104,2],[1,222,66,100,2],[2,472,60,136,4],[3,70,330,110,2],[4,223,330,108,2]]},
    {id:'public-transit',module:'public',name:'交通枢纽片区',summary:'换乘通道 · 便民窗口 · 双入口',pattern:'lanes',xs:[32,160,310,480,672,792],ys:[32,132,228,318,420],primary:[540,150],features:['换乘大厅','便民窗口','候车区'],buildings:[[0,61,53,82,2],[1,190,52,95,2],[2,467,54,150,4],[3,58,328,95,2],[4,190,328,94,2]]},
    {id:'public-oldtown',module:'public',name:'老城更新街区',summary:'曲折支路 · 社区食堂 · 口袋公园',pattern:'alleys',xs:[32,210,355,500,672,792],ys:[32,174,228,340,420],primary:[550,160],features:['社区食堂','口袋公园','小型服务点'],buildings:[[0,65,76,105,2],[1,242,75,91,2],[2,478,64,144,4],[3,70,349,105,2],[4,238,347,92,2]]},
    {id:'growth-campus',module:'growth',name:'创新园区',summary:'分散楼栋 · 连廊 · 协作庭院',pattern:'grid',river:true,legacy:true,features:['体验中心','协作庭院','顾问站']},
    {id:'growth-expo',module:'growth',name:'产品体验展场',summary:'展厅环线 · 演示台 · 分区体验',pattern:'loop',xs:[32,206,376,470,672,792],ys:[32,145,228,310,420],primary:[540,155],features:['产品展厅','演示舞台','咨询台'],buildings:[[0,67,57,110,2],[1,237,55,111,2],[2,466,59,152,4],[3,62,324,116,2],[4,239,322,106,2]]},
    {id:'growth-headquarters',module:'growth',name:'总部办公园区',summary:'办公楼群 · 中央草坪 · 会议中心',pattern:'cross',xs:[32,187,356,462,672,792],ys:[32,160,228,312,420],primary:[538,154],features:['会议中心','中央草坪','员工餐厅'],buildings:[[0,61,58,102,3],[1,220,58,105,3],[2,466,57,145,4],[3,64,328,107,2],[4,223,326,105,2]]},
    {id:'growth-city',module:'growth',name:'城市体验街区',summary:'沿街体验店 · 快闪空间 · 多入口',pattern:'lanes',xs:[32,194,346,483,672,792],ys:[32,150,228,324,420],primary:[548,156],features:['体验店','快闪空间','培训室'],buildings:[[0,65,62,104,2],[1,220,61,104,2],[2,470,61,152,4],[3,66,333,104,2],[4,219,332,105,2]]},
    {id:'merchant-riverside',module:'merchant',name:'滨水周末集市',summary:'沿河步道 · 成组摊位 · 桥头入口',pattern:'grid',river:true,legacy:true,features:['概念门店','周末集市','河岸步道']},
    {id:'merchant-highstreet',module:'merchant',name:'城市商业街',summary:'十字街口 · 连续店面 · 配送通道',pattern:'cross',xs:[32,182,350,480,672,792],ys:[32,150,228,312,420],primary:[545,158],features:['连续店面','外摆区','配送通道'],buildings:[[0,62,61,102,2],[1,214,60,105,2],[2,472,62,146,4],[3,62,326,102,2],[4,216,326,107,2]]},
    {id:'merchant-neighborhood',module:'merchant',name:'社区邻里商业',summary:'住宅底商 · 生鲜店 · 取件点',pattern:'alleys',xs:[32,202,355,470,672,792],ys:[32,170,228,324,420],primary:[538,157],features:['生鲜店','早餐铺','取件点'],buildings:[[0,64,75,110,2],[1,232,74,100,2],[2,467,61,145,4],[3,66,333,110,2],[4,231,333,100,2]]},
    {id:'merchant-night',module:'merchant',name:'夜间餐饮街',summary:'步行主街 · 餐饮摊位 · 共享座椅',pattern:'lanes',xs:[32,182,342,480,672,792],ys:[32,149,228,320,420],primary:[546,157],features:['餐饮摊位','排队区','夜间照明'],buildings:[[0,62,60,102,2],[1,211,61,106,2],[2,470,61,149,4],[3,64,330,104,2],[4,212,330,105,2]]}
  ];
  const byId = Object.fromEntries(maps.map(map => [map.id, map]));
  const defaults = {public:'public-plaza',growth:'growth-campus',merchant:'merchant-riverside'};
  function forModule(module) { return maps.filter(map => map.module === module); }
  function get(id, module) { return byId[id]?.module === module ? byId[id] : byId[defaults[module] || defaults.merchant]; }
  global.YanceMaps = {maps,forModule,get,defaults,rows};
})(window);
