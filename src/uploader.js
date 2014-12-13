/**
 *
 */
;(function(root) {

var Form = Backbone.Form;

var attaches = {};

attaches.Entities = {
  attach : Backbone.Model.extend({
    defaults:{
      name:''
    },
    urlRoot:'/files'
  })
};

attaches.Entities.attaches = Backbone.Collection.extend({
  model: attaches.Entities.attach
});

attaches.Template = {
  attachView : _.template('<span class="field-attach-name label label-primary"><%= name %></span><a href="javascript:;" class="fa fa-remove">×</a>'),
  attachesView : _.template('<button class="uploadBtn" type="button">上传文件</button><div class="field-attaches"></div>')
}

attaches.AttachView = Backbone.View.extend({
  className: 'field-attach',
  template: attaches.Template.attachView,
  initialize: function(){
    _.bindAll( this, 'onRemove', 'onProcess' );
    this.model
      .on('remove', this.onRemove )
      .on('change', this.onProcess )
  },
  render: function(){
    this.$el.append( this.template(this.model.toJSON()) );
    this.model.get('uploading') && this._initProcessing();
    return this;
  },
  onRemove: function(){
    this.$el.remove();
  },
  _initProcessing: function(){
    this.$el.append('<div class="progress">\
      <div class="progress-bar progress-bar-success active" style="width: 50%"> 0% </div>\
    </div>');
  },
  onProcess: function(){
    if(!this.model.get('uploading')){
      this.$el.find('.progress').remove();
      return;
    }
    var progress = Math.floor(this.model.get('loaded')/this.model.get('total'))*100+'%';
    this.$el.find('.progress-bar').css('width', progress).html(progress);
  }
});

attaches.AttachesView = Backbone.View.extend({
  initialize: function(options){
    _.bindAll( this, 'addOne' )
    this.collection.on('add', this.addOne)
    // this.render();
  },
  render: function(){
    this.$el.append( attaches.Template.attachesView() );
    this.$container = this.$el.find('.field-attaches');
    this.collection.each( this.addOne );
    return this;
  },
  addOne: function(model){
    var view = new attaches.AttachView({ model: model });
    this.$container.append( view.render().$el );
  }
});

attaches.defaultOptions = {
  multiple: true,
  params:{},
  url:'/devp/uploader/upload.php',
  // 将上传成功后的文件添加到列表中
  addUploaded: function( file ){
    this.collection.add( file );
  },
  // 删除已上传的文件
  removeUploaded: function( file_id ){
    this.setValue( _.reject(this.getValue(), function(f){ return f.id == file_id; }) );
  },
  // 更新文件显示列表
  updateList: function(files) {},
  fileInvalid: function(name, message) {},
  tooManyFile: function(name, message) {},
  beforeUpload: function(uniqueId, name, data, xhr) {},
  uploadStart: function(uniqueId, name) {},
  uploadComplete: function(uniqueId, name, resp, status, xhr) {
    if(status != 200) return;
    resp = JSON.parse(resp);
    var fileinfo = _.pick(resp,'id','name','file_size','file_type','show_name','type');
    if( resp['file_type']=='osns_n_image') fileinfo.thumb = resp.append.thumbnails.link;
    this.collection.get(uniqueId).clear({silent:true}).set( fileinfo );
  },
  uploadError: function(uniqueId, name, message) {},
  uploadProgress: function(uniqueId, name, loaded, total) {
    if(!this.collection.get(uniqueId)) return;
    this.collection.get(uniqueId).set({loaded:loaded, total:total});
  },
  fileAdd: function(uniqueId, name, file) {
    // 将准备上传的文件添加到Collection中
    this.collection.add( _.extend({},file, {id:uniqueId, uploading: true}) );
  },
  fileRemove: function(uniqueId, name) {},
  uploadAbort: function(uniqueId, name) {}
}


Form.editors.Uploader = Form.editors.Text.extend({
  tagName: 'div',
  events: {
    'change input[type=file]': 'uploadFile',
    'click .remove': 'removeFile'
  },
  initialize: function(options) {
    _.extend( this, {}, attaches.defaultOptions, options.schema);
    _.bindAll(this, 'fileAdd', 'fileRemove', 'fileInvalid', 'tooManyFile', 'beforeUpload', 'uploadStart', 'uploadAbort', 'uploadComplete', 'uploadError', 'uploadProgress');
    Form.editors.Text.prototype.initialize.call(this, options);

    console.log('options',options)
    this.collection = new attaches.Entities.attaches(this.model.get(this.key) || []);
    //Template
    this.template = options.template || this.constructor.template;
    options.dropZone && this._initdropZone();
  },
  // getValue: function() {},
  // setValue: function(value) {}
  render: function(options) {
    Form.editors.Text.prototype.render.apply(this, arguments);
    this.attaches = new attaches.AttachesView({
      collection : this.collection
    })
    this.$el.append( this.attaches.render().$el )

    if( this.selectButton ){
      this.$selectButton = this.$('.uploadBtn');
      console.log('this.$selectButton 1',this.$selectButton.length)
      this._initSelectButton();
    }
    return this;
  },
  _initSelectButton: function( btn ){
    console.log('this.$selectButton 2',this.$selectButton.length)
    this.uploader = new Uploader({
      selectButton: this.$selectButton,
      url: this.url,
      data: this.params
    });
    this.uploader
      .on("fileAdd", this.fileAdd)
      .on("fileRemove", this.fileRemove)
      .on("fileInvalid", this.fileInvalid)
      .on("tooManyFile", this.tooManyFile)
      .on("beforeUpload", this.beforeUpload)
      .on("uploadStart", this.uploadStart)
      .on("uploadProgress", this.uploadProgress)
      .on("uploadAbort", this.uploadAbort)
      .on("uploadComplete", this.uploadComplete)
      .on("uploadFail", this.uploadError);
  }
},{
  template: _.template('\
    <input type="file" multiple="<%= multiple %>" />\
  ', null, Form.templateSettings),
});

Form.attaches = attaches;

})(window || global || this);
