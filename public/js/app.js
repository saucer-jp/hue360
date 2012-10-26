// app.js
// author: Tsukasa Obara
// url   : http://saucer.jp

$(function(){

  // ********************
  // init
  // ********************
  var statuses = {
    colorSpace: 'munsell',
    hueStep: 20,
    chromaStep: 7,
    brightness: 0,
    judge: null,
    baseColor: null,
    baseColorId: null
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
    statuses.judge = val;
  }

  function BGColorInit(){
    var val = $('#BGColor').find('option:selected').val();
    $('body').css('background', val );
  }

  function createColorCircle( statuses ){
    $('#colorCircle').find('.circle').remove();
    App.circle = new ColorCircle( statuses ).judge().render();
  }



});
