// app.js
// author: Tsukasa Obara
// url   : http://saucer.jp

$(function(){

  // ********************
  // init
  // ********************
  var ua = getUserInfo();
  $('body').addClass( ua.info );

  var statuses = {
    colorSpace: 'munsell',
    hueStep: 20,
    chromaStep: 7,
    brightness: 0,
    judgeFlg: null,
    baseColor: null,
    baseColorId: null,
    baseColorBrightness: null
  };

  App = {};
  colorSpaceInit();
  hueStepInit();
  chromaStepInit();
  judgeInit();
  BGColorInit();
  App.circle = new ColorCircle( statuses ).render();



  // ********************
  // events
  // ********************
  // --------------------
  // #brightness .chip のクリック
  // --------------------
  $('#brightness').find('.chip').on('click touchstart', function(e){
    if( e.shiftKey ) return;

    var current = 'current-brightness';
    $(this).siblings('.'+ current).removeClass(current);
    $(this).addClass(current);

    if( $(this).is('.chip1') ){
      statuses.brightness = 0;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip2') ){
      statuses.brightness = 1;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip3') ){
      statuses.brightness = 2;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip4') ){
      statuses.brightness = 3;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip5') ){
      statuses.brightness = 4;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip6') ){
      statuses.brightness = 5;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip7') ){
      statuses.brightness = 6;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip8') ){
      statuses.brightness = 7;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip9') ){
      statuses.brightness = 8;
      createColorCircle( statuses );
      return false;

    } else if( $(this).is('.chip10') ){
      statuses.brightness = 9;
      createColorCircle( statuses );
      return false;
    }
  });


  // --------------------
  // Color Controller 部分の変更
  // --------------------
  $('select').on( 'change', function(){

    $this = $(this);
    var val;

    if( $this.is('#colorSpace') ){
      colorSpaceInit();
      createColorCircle( statuses );

    } else if ( $this.is('#hueStep') ){
      hueStepInit();
      createColorCircle( statuses );

    } else if ( $this.is('#chromaStep') ){
      chromaStepInit();
      createColorCircle( statuses );

    } else if ( $this.is('#judge') ){
      judgeInit();
      createColorCircle( statuses );

    } else if ( $this.is('#BGColor') ){
      BGColorInit();
    }
  });


  // --------------------
  // .chip のクリック
  // --------------------
  $(document).on( 'click touchstart', '.chip', function(e){
    var chipColor = $(this).css('background-color');
    var chipColorId = $(this).data('chip-id');

    // shift + click
    if( e.shiftKey ){
      $('body').css( 'background-color', chipColor );
      return;
    }

    // set baseColor
    // TODO 同様の機能がUserColor.printにあるので関数化せよ
    if ( /rgb/.test( chipColor ) ){
      var rgb = {
        r: null,
        g: null,
        b: null
      };
      var _rgb = chipColor.match(/\d+/g);
      rgb.r = _rgb[ 0 ];
      rgb.g = _rgb[ 1 ];
      rgb.b = _rgb[ 2 ];
      chipColor = RGBtoWEB( rgb );
    }

    if( statuses.baseColor == null ){
      statuses.baseColor = chipColor;
      statuses.baseColorId = chipColorId;
      statuses.baseColorBrightness = statuses.brightness;
      createColorCircle( statuses );
      App.userColor = new UserColor().render( chipColor );
    } else {
      App.userColor.render( chipColor );
      if( $('#print').find('ul').length ) App.userColor.print(); // MEMO どうなの？
    }
  });


  // --------------------
  // #userColor .remove-btn のクリック
  // --------------------
  $(document).on( 'click', '#userColor .remove-btn', function(){
    var $this = $(this).parent();
    if( $this.is('.base-color') ){
      // MEMO ここどうなの？
      statuses.baseColor = null;
      createColorCircle( statuses );
      App.userColor.remove();
      $('#print').empty();
    }
    if( $this.is('.sub-color') ){
      // MEMO ここどうなの？
      App.userColor.remove( $this );
      if( $('#print').find('ul').length ) App.userColor.print(); // MEMO どうなの？
    }
  });


  // --------------------
  // #print .remove-btn のクリック
  // --------------------
  $(document).on( 'click', '#print .remove-btn', function(){
    $('#print').empty();
  });


  // --------------------
  // #userColor .print-user-color のクリック
  // --------------------
  $(document).on( 'click touchstart', '#userColor .print-user-color', function(){
    App.userColor.print();
  });


  // --------------------
  // ショートカット
  // --------------------

  $(document).keydown(function( event ){
    switch ( event.keyCode.toString() ) {

      // del key
      case "8":
        if( App.userColor == undefined ) return false;
        App.userColor.lastColorRemove();
        if( $('#print').find('ul').length ) App.userColor.print(); // MEMO どうなの？
        return false;
        break;

      // default
      default:
    }
  });

  // ********************
  // functions
  // ********************
  function colorSpaceInit(){
    var val = $('#colorSpace').find('option:selected').val();
    statuses.colorSpace = val;
  }

  function hueStepInit(){
    var val = $('#hueStep').find('option:selected').val();
    statuses.hueStep = val;
  }

  function chromaStepInit(){
    var val = $('#chromaStep').find('option:selected').val();
    statuses.chromaStep = val;
  }

  function judgeInit(){
    var val = $('#judge').find('option:selected').val();
    if( val == 'true' ) val = true;
    if( val == 'false' ) val = false;
    statuses.judgeFlg = val;
  }

  function BGColorInit(){
    var val = $('#BGColor').find('option:selected').val();
    $('body').css('background', val );
  }

  function createColorCircle( statuses ){
    $('#colorCircle').find('.circle').remove();
    App.circle = new ColorCircle( statuses ).judge().render();
  }

  function getUserInfo(){

    var user = {
      agent: '',
      info: []
    };
    user.agent = window.navigator.userAgent.toLowerCase();

    var device = {
      0: 'ipod',
      1: 'ipad',
      2: 'iphone',
      3: 'android',
      4: 'win-phone',
      5: 'blackberry',
      6: 'pc'
    };
    var os = {
      0: {
        0: 'win',
        1: 'xp',
        2: 'vista',
        3: 'win7',
        4: 'win8' },
      1: {
        0: 'mac',
        1: 'ios' },
      2: 'linux'
    };
    var engine = {
      0: 'trident',
      1: 'webkit',
      2: 'gecko'
    };
    var browser = {
      0: {
        0: 'ie',
        1: 'ie6',
        2: 'ie7',
        3: 'ie8',
        4: 'ie9',
        5: 'ie10' },
      1: 'chrome',
      2: 'safari',
      3: 'firefox',
      4: 'opera'
    };

    // device
    if( /ipod/.test( user.agent ) ){
      user.info.push( device[0] );
    } else if ( /ipad/.test( user.agent ) ){
      user.info.push( device[1] );
    } else if ( /iphone/.test( user.agent ) ){
      user.info.push( device[2] );
    } else if ( /android/.test( user.agent ) ){
      user.info.push( device[3] );
    } else if ( /windows phone/.test( user.agent ) ){
      user.info.push( device[4] );
    } else if ( /blackberry/.test( user.agent ) ){
      user.info.push( device[5] );
    } else {
      user.info.push( device[6] );
    }

    // os
    if( /windows/.test( user.agent ) ){
      user.info.push( os[0][0] );
      if( /windows nt 5\.1/.test( user.agent ) ){
        user.info.push( os[0][1] );
      } else if ( /windows nt 6\.0/.test( user.agent ) ){
        user.info.push( os[0][2] );
      } else if ( /windows nt 6\.1/.test( user.agent ) ){
        user.info.push( os[0][3] );
      } else if ( /windows nt 6\.2/.test( user.agent ) ){
        user.info.push( os[0][4] );
      }
    } else if ( /mac/.test( user.agent ) ){
      user.info.push( os[1][0] );
      if( /iphone|ipad|ipod/.test( user.agent ) ){
        user.info.push( os[1][1] );
      }
    } else if ( /linux/.test( user.agent ) ){
      user.info.push( os[2] );
    }

    // engine
    if( /msie/.test( user.agent ) ){
      user.info.push( engine[0] );
    } else if ( /webkit/.test( user.agent ) ){
      user.info.push( engine[1] );
    } else if ( /gecko/.test( user.agent ) ){
      user.info.push( engine[2] );
    }

    // browser
    if( /msie/.test( user.agent ) ){
      user.info.push( browser[0][0] );
      if( /msie 6/.test( user.agent ) ){
        user.info.push( browser[0][1] );
      } else if ( /msie 7/.test( user.agent ) ){
        user.info.push( browser[0][2] );
      } else if ( /msie 8/.test( user.agent ) ){
        user.info.push( browser[0][3] );
      } else if ( /msie 9/.test( user.agent ) ){
        user.info.push( browser[0][4] );
      } else if ( /msie 10/.test( user.agent ) ){
        user.info.push( browser[0][5] );
      }
    } else if ( /chrome/.test( user.agent ) ){
      user.info.push( browser[1] );
    } else if ( /safari/.test( user.agent ) ){
      user.info.push( browser[2] );
    } else if ( /firefox/.test( user.agent ) ){
      user.info.push( browser[3] );
    } else if ( /opera/.test( user.agent ) ){
      user.info.push( browser[4] );
    }

    user.info = user.info.join(' ');
    return user;
  };


});
