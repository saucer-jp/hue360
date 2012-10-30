// color-circle.js
// author: Tsukasa Obara
// url   : http://saucer.jp

// ********************
// constructors
// ********************

// MEMO colorの受け渡しは全てweb colorで行う仕様とする。

// --------------------
// カラーサークル
// --------------------
function ColorCircle( initStatuses ){
  // data
  var data = {
    colorSpace: null,
    colorStatuses: null,
    chipStatuses: null,
    colorCircle: null,
    baseColor: null,
    baseColorId: null
  };


  // statuses
  var statuses = {
    colorSpace: 'munsell',
    name: 'circle',
    hueStep: 20,
    chromaStep: 7,
    brightness: 0,
    radius: 300,
    chipSize: 30,
    selector: '#colorCircle',
    top: 300,
    left: 700,
    baseColor: null,
    baseColorId: null,
    clashClass: 'color-clash'
  };


  // set
  var _set = function( initStatuses ){
    var s = statuses;
    $.each( initStatuses, function( key, val ){
      s[ key ] = val;
    });
    statuses = s;
  };

  // create
  var _create = function(){
    if( !!initStatuses ) _set( initStatuses );

    var d = data;
    var s = statuses;

    // set color space
    d.colorSpace = s.colorSpace;

    // set color statuses
    var color = new Color();
    d.colorStatuses = color.statuses( s );

    // set base color
    d.baseColor = s.baseColor;

    // set base color id
    d.baseColorId = s.baseColorId;

    // set chip statuses
    var chip = new Chip();
    d.chipStatuses = chip.statuses( s );

    // color circle
    d.colorCircle = chip.create( d );
    
    // set data
    data = d;

    return this;
  };
  _create();


  // render
  this.render = function(){
    var d = data;
    var s = statuses;
    var name = s.name;

    // TODO render option をつける append, replaceWith...

    $colorCircle = d.colorCircle;
    $colorCircle.addClass( name );
    $colorCircle.attr( 'data-color-space', s.colorSpace );
    $colorCircle.css({
      position: 'absolute',
      top: s.top + 'px',
      left: s.left + 'px'
    }).appendTo( s.selector );

    return this;
  };


  // get data
  this.get = function(){
    return data;
  };


  // judge
  this.judge = function(){
    var d = data;
    var s = statuses;
    var chromaStep = s.chromaStep;
    var judgeFlg = s.judgeFlg;
    var chipStatuses = d.chipStatuses;
    var colorStatuses = d.colorStatuses;
    var baseColor = d.baseColor;
    if( baseColor == null ) return this;
    if( judgeFlg == false ){
      d.colorCircle.find('.chip').removeClass( s.clashClass );
      return this;
    }

    var roop = colorStatuses.length;
    var id = null;
    var webColor = null;
    var selector = null;

    for( var i = 0; i < roop; i++ ){
      id = i;
      webColor = colorStatuses[ id ].web;
      selector = 'span[data-chip-id="' + id + '"]';

      if( judgeColor( d, s, i, webColor ) == false ){
        d.colorCircle.find( selector ).addClass( s.clashClass );
      }
    }

    data = d;

    return this;
  };
}


// --------------------
// 明度
// --------------------
// MEMO ちょっと間に合わないので放置 2012/10/11
function Brightness(){
  // data
  var data = {
    brightness: null
  };


  // statuses
  var statuses = {
    selector: 'body',
    top: 380,
    left: 380
  };


  // create
  var _create = function(){
    return this;
  };
  _create();


  // render
  this.render = function(){
    var d = data;
    var s = statuses;
    var name = 'brightness';

    $brightness = d.brightness;
    $brightness.addClass( name );
    $brightness.css({
      position: 'absolute',
      top: s.top + 'px',
      left: s.left + 'px'
    }).appendTo( s.selector );

    return this;
  };


  // get data
  this.get = function(){
    return data;
  };
}


// --------------------
// カラー作成
// --------------------
function Color(){
  // munsell data
  var munsellData = [
    '#C7243A', // 5R
    '#EDAD0B', // 5YR
    '#FFE600', // 5Y
    '#A3C520', // 5GY
    '#009250', // 5G
    '#0086AB', // 5BG
    '#0079B7', // 5B
    '#5D639E', // 5PB
    '#932675', // 5P
    '#B61971' // 5RP
  ];


  // rgb data
  var rgbData = [
    '#FF0000',
    '#FF9900',
    '#CCFF00',
    '#33FF00',
    '#00FF66',
    '#00FFFF',
    '#0066FF',
    '#3300FF',
    '#CC00FF',
    '#FF0099'
  ];


  // rgb extend data
  var rgbExData = [
    '#FF0022',
    '#FFA700',
    '#FFE600',
    '#CAFF00',
    '#00FF8C',
    '#00C8FF',
    '#00A9FF',
    '#0018FF',
    '#FF00BA',
    '#FF0055'
  ];


  // brightness data
  var brightnessData = [
    '#FFFFFF',
    '#E3E3E3',
    '#C6C6C6',
    '#AAAAAA',
    '#8E8E8E',
    '#717171',
    '#555555',
    '#393939',
    '#1C1C1C',
    '#000000'
  ];


  // get fixed color
  var _getFixedColor = function( option ){
    switch( option ){
      case 'munsell':
        return munsellData;
        break;

      case 'rgb':
        return rgbData;
        break;

      case 'rgb+':
        return rgbExData;
        break;

      case 'brightness':
        return brightnessData;
        break;

      default:
        break;
    }
  };

  // flat brightness create
  var _flatBrightnessCreate = function( webColor, count, statuses ){
    var result = null;
    var c = count;
    var s = statuses;
    var hsb = WEBtoHSB( webColor );

    var brightnessData = _getFixedColor( 'brightness' );
    
    //var startColor = WEBtoHSB( brightnessData[ 0 ] );
    var startColor = hsb;
    var endColor = WEBtoHSB( brightnessData[ brightnessData.length - 1 ] );
    var stB = startColor.b;
    var enB = endColor.b


    var range = ( stB - enB ) / brightnessData.length;
    var negaBrightness = range * s.brightness;

    hsb.b = hsb.b - negaBrightness;

    result = HSBtoWEB( hsb );
    return result;
  };

  // chroma create
  var _chromaCreate = function( webColor, count, statuses ){
    var result = null;
    var c = count;
    var s = statuses;
    var hsb = WEBtoHSB( webColor );

    var range = hsb.s / ( s.chromaStep - 1 );
    var negaChroma = range * ( c.chroma - 1 );

    hsb.s = hsb.s - negaChroma;

    result = HSBtoWEB( hsb );
    return result;
  };

  // brightness create
  var _brightnessCreate = function( webColor, count, statuses ){
    var result = null;
    var c = count;
    var s = statuses;
    var hsb = WEBtoHSB( webColor );

    var brightnessData = _getFixedColor( 'brightness' );
    var startColor = WEBtoHSB( webColor );
    var endColor = WEBtoHSB( brightnessData[ s.brightness ] );
    var stB = startColor.b;
    var enB = endColor.b

    var max = Math.max( stB, enB );
    var min = Math.min( stB, enB );
    var range = ( max - min ) / ( s.chromaStep - 1 );
    var negaBrightness = range * ( c.chroma - 1 );

    if( max == stB ){
      hsb.b = hsb.b - negaBrightness;
    } else if ( max == enB ){
      hsb.b = hsb.b + negaBrightness;
    }

    result = HSBtoWEB( hsb );
    return result;
  };

  // get between color
  var _getBetweenColor = function( stepSize, stepCount, startColor, endColor ){
    var result = null;

    var startHSB = WEBtoHSB( startColor );
    var endHSB = WEBtoHSB( endColor );
    var st = startHSB;
    var en = endHSB;

    var max = {
      h: Math.max( st.h, en.h ),
      s: Math.max( st.s, en.s ),
      b: Math.max( st.b, en.b )
    };
    var min = {
      h: Math.min( st.h, en.h ),
      s: Math.min( st.s, en.s ),
      b: Math.min( st.b, en.b )
    };

    var hsb = {
      h: 0,
      s: 0,
      b: 0
    };

    var range = {
      h: 0,
      s: 0,
      b: 0
    };

    // hue
    // TODO ifだらけでキタネーからあとで直す
    if( max.h - min.h > 180 ){
      var h =  360 - max.h;
      range.h = ( ( h + min.h ) / stepSize ) * ( stepCount - 1 );
      if( max.h == st.h ){
        hsb.h = st.h + range.h;
        if( hsb.h >= 360 ) hsb.h = hsb.h - 360;
      }
    } else {
      range.h = ( ( max.h - min.h ) / stepSize ) * ( stepCount - 1 );
      if( max.h == st.h ) hsb.h = st.h - range.h;
    }
    if ( max.h == en.h ) hsb.h = st.h + range.h;

    // saturation
    range.s = ( ( max.s - min.s ) / stepSize ) * ( stepCount - 1 );
    if( max.s == st.s ){
      hsb.s = st.s - range.s;
    } else if ( max.s == en.s ){
      hsb.s = st.s + range.s;
    }

    // brightness
    range.b = ( ( max.b - min.b ) / stepSize ) * ( stepCount - 1 );
    if( max.b == st.b ){
      hsb.b = st.b - range.b;
    } else if ( max.b == en.b ){
      hsb.b = st.b + range.b;
    }

    result = HSBtoWEB( hsb );
    return result;
  };

  // get web color
  var _getWebColor = function( stepSize, count, statuses, fixedColor ){
    var result = null;
    var webColor = null;
    var c = count;
    var s = statuses;
    var startColor = fixedColor[ c.startColor ];
    var endColor = null;

    // end color
    if( fixedColor.length == c.endColor ){
      endColor = fixedColor[ 0 ];
    } else {
      endColor = fixedColor[ c.endColor ];
    }

    // vivid color create
    if( c.step == 1 ){
      webColor = startColor;
    } else {
      webColor = _getBetweenColor( stepSize, c.step, startColor, endColor );
    }

    // flat brightness create
    webColor = _flatBrightnessCreate( webColor, c, s );

    // chroma create
    webColor = _chromaCreate( webColor, c, s );

    // brightness create
    webColor = _brightnessCreate( webColor, c, s );

    result = webColor;
    return result;
  };

  // statuses
  this.statuses = function( statuses ){
    /*
    var result = [{
      id: 0,
      web: '#000',
      rgb: ['0','0','0'],
      hue: '5h', // 36~360 // 今回はナシ
      brightness: '5/', // 1~10 // 今回はナシ
      chroma: '14', // 1~14 // 今回はナシ
      munsell: 'munsell color name' // 今回はナシ
    }];
    */

    // create color statuses array
    var s = statuses;
    var hueStep = s.hueStep;
    var chromaStep = s.chromaStep;
    var brightness = s.brightness;
    var result = [];
    var roop = hueStep * chromaStep;
    var fixedColor = _getFixedColor( s.colorSpace );
    var fixedLength = fixedColor.length;
    var stepSize = hueStep / fixedLength;
    var count = {
      hue: 1,
      chroma: 1,
      step: 1,
      startColor: 0,
      endColor: 1
    };
    var webColor;

    for( var i = 0; i < roop; i++ ){
      webColor = _getWebColor( stepSize, count, s, fixedColor );
      var obj = {
        id: i,
        web: webColor,
        rgb: WEBtoRGB( webColor ),
        hsb: WEBtoHSB( webColor ),
        stepNum: {
          hue: count.hue,
          chroma: count.chroma,
          brightness: brightness
        }
      };
      result[ i ] = obj;

      if( count.step == stepSize ){
        count.step = 1;
        count.startColor++;
        count.endColor++;
      } else {
        count.step++;
      }

      if( count.hue == hueStep ){
        count.hue = 1;
        count.chroma++;
        count.startColor = 0;
        count.endColor = 1;
      } else {
        count.hue++;
      }
    }

    return result;
  };
}


// --------------------
// チップ
// --------------------
function Chip(){
  // get deg
  var _getDeg = function( hueStep, i ){
    var result = null;
    result = 360 / hueStep * i;
    return result;
  };


  // get radius
  var _getRadius = function( radius, chipSize, chromaCount ){
    var result = null;
    var chromaCount = chromaCount - 1;
    var margin = 2;
    var reduce = ( chipSize + margin ) * chromaCount;
    result = radius - ( radius * 2 - reduce );
    return result;
  };


  // get scale
  var _getScale = function(){
    var result = 1; // MEMO ややこしいのでしばらく"1"で
    return result;
  };


  // statuses
  this.statuses = function( statuses ){
    /*
    var result = [{
      id: 0,
      deg: 0,
      radius: 0,
      scale: 1,
      chipSize: 34
    }];
    */

    // create chip statuses array
    var s = statuses;
    var hueStep = s.hueStep;
    var chromaStep = s.chromaStep;
    var radius = s.radius;
    var chipSize = s.chipSize;
    var result = [];
    var roop = hueStep * chromaStep;
    var hueCount = 1;
    var chromaCount = 1;

    for( var i = 0; i < roop; i++ ){
      var obj = {
        id: i,
        deg: _getDeg( hueStep, i ),
        radius: _getRadius( radius, chipSize, chromaCount ),
        scale: _getScale(),
        chipSize: chipSize
      };
      result[ i ] = obj;

      if( hueCount == hueStep ){
        hueCount = 1;
        chromaCount++;
      } else {
        hueCount++;
      }
    }

    return result;
  };


  // create
  this.create = function( data ){
    var co = data.colorStatuses;
    var ch = data.chipStatuses;

    var $chip = $('<span class="chip"/>');
    var $result = $('<div/>');
    var roop = co.length;

    var _co = null;
    var _ch = null;
    var _$chip = null;
    var id = null;
    var bgColor = null;
    var deg = null;
    var radius = null;
    var scale = null;
    var chipSize = null;
    var chipRadius = 4;
    var baseColor = data.baseColor;

    for( var i = 0; i < roop; i++ ){
      _co = co[ i ];
      _ch = ch[ i ];
      _$chip = $chip.clone();
      id = i;
      bgColor = _co.web;
      deg = _ch.deg;
      radius = _ch.radius;
      scale = _ch.scale;
      chipSize = parseInt( _ch.chipSize );

      _$chip.attr( 'data-chip-id', id ).attr({
        style:function(){
          var style = [
            '-webkit-transform:',
              'rotate(' + deg + 'deg)',
              'translate(0,' + radius + 'px)',
              'scale(' + scale + ')',
              //'perspective(100)',
              //'rotateX(45deg)',
            ';',
            '-moz-transform:',
              'rotate(' + deg + 'deg)',
              'translate(0,' + radius + 'px)',
              'scale(' + scale + ')',
            ';',
            'transform:',
              'rotate(' + deg + 'deg)',
              'translate(0,' + radius + 'px)',
            ';'
          ];
          return style.join('');
        }()
      }).css({
        width: chipSize + 'px',
        height: chipSize + 'px',
        backgroundColor: bgColor,
        borderRadius: chipRadius + 'px'
      });
      
      //if( bgColor == '#ffffff' ){
      //  _$chip.addClass('white-chip');
      //}

      if( bgColor == baseColor ){
        _$chip.addClass('current-base-color');
      }

      $result.append( _$chip );
    }

    return $result;
  };
}


// --------------------
// ユーザーカラー
// --------------------
function UserColor(){
  // user data
  var userData = {
    baseColor: null,
    selectedColor: [
      //'#123456',
      //'#123456'
    ]
  };


  // statuses
  var statuses = {
    selector: '#userColor',
    selectedClass: 'selected-color',
    baseColorClass: 'base-color',
    subColorClass: 'sub-color',
    colorCodeClass: 'color-code',
    removeBtnClass: 'remove-btn',
    printTarget: '#print',
    subColorCount: 0
  };


  //var _removeBaseColor = function( $this ){
  //  $this.remove();
  //};

  //var _removeSubColor = function( $this ){
  //  $this.remove();
  //};


  // set
  var _set = function( webColor ){
    var u = userData;
    var b = u.baseColor;
    var s = u.selectedColor;
    if( b == null ){
      u.baseColor = webColor;
    } else {
      u.selectedColor.push( webColor );
    }
    userData = u;
  };


  // get
  this.get = function(){
    return userData;
  };


  // render
  this.render = function( webColor ){
    var u = userData;
    var s = statuses;
    var $userColor = $( s.selector );

    var $removeBtn = $('<span/>')
      .addClass( s.removeBtnClass );

    var $baseColor = $('<span/>')
      .css('background-color', webColor)
      .addClass( s.selectedClass )
      .addClass( s.baseColorClass )
      .append('<span class="print-user-color">Print User Color</span>')
      .append(function(){
        var r = $removeBtn.clone();
        r.append('<em>All Clear</em>');
        return r;
      });

    var $subColor = $('<span/>')
      .css('background-color', webColor)
      .addClass( s.selectedClass )
      .addClass( s.subColorClass )
      .attr( 'data-sub-color-id', s.subColorCount )
      .append( $removeBtn.clone() );

    if( u.baseColor == null ){
      $userColor.append( $baseColor.clone() );
    } else {
      $userColor.append( $subColor.clone() );
      s.subColorCount++;
    }

    statuses = s;

    // set data
    _set( webColor );

    return this;
  };

  // print
  this.print = function(){
    var u = userData;
    var s = statuses;

    var printTarget = s.printTarget;

    var $colorCode = $('<ul/>');
    var _$list = $('<li/>')
      .append('<span class="chip"/>')
      .append('<span class="key"/>')
      .append('<span class="val"/>')

    var $removeBtn = $('<span/>')
      .addClass( s.removeBtnClass );

    // set bgColor colde
    var val = (function(){
      var v = $('body').css( 'background-color' );
      if ( /rgb/.test( v ) ){
        var rgb = {
          r: null,
          g: null,
          b: null
        };
        var _rgb = v.match(/\d+/g);
        rgb.r = _rgb[ 0 ];
        rgb.g = _rgb[ 1 ];
        rgb.b = _rgb[ 2 ];
        v = RGBtoWEB( rgb );
      }
      return v;
    })();
    var $list = _$list.clone();
    // TODO bgColorをuserDataに入れろ！
    $list.find('.chip').css( 'background-color', val );
    $list.find('.key').text( 'bgColor: ' );
    $list.find('.val').text( val.toUpperCase() );
    $colorCode.append( $list );

    // set base, sub color code
    $.each( u, function( key, val ){
      var $list = null;

      if( $.isArray( val ) ){
        $.each( val, function( key, val ){
          if( val == null ) return;
          $list = _$list.clone();
          $list.find('.chip').css( 'background-color', val );
          $list.find('.key').text( 'subColor: ' );
          $list.find('.val').text( val.toUpperCase() );
          $colorCode.append( $list );
        });

      } else {
        $list = _$list.clone();
        $list.find('.chip').css( 'background-color', val );
        $list.find('.key').text( key + ': ' );
        $list.find('.val').text( val.toUpperCase() );
        $colorCode.append( $list );
      }
    });

    $( printTarget )
      .empty()
      .append( $colorCode )
      .append( $removeBtn.clone() );
    return this;
  };


  // remove
  this.remove = function( $this ){
    var u = userData;
    var s = statuses;
    if( !$this ){
      u.baseColor = null;
      u.selectedColor = [];
      $( s.selector ).empty();
    } else if ( $this.is( '.' + s.subColorClass ) ){
      var subColorId = $this.data( 'sub-color-id' );
      u.selectedColor[ subColorId ] = null;
      $this.remove();
    }
    userData = u;
    return this;
  };


  // save
  this.save = function(){
    // 間に合わないので、後で作る
    return this;
  };


  // load
  this.load = function(){
    // 間に合わないので、後で作る
    return this;
  };


  // destroy
  this.destroy = function(){
    // 間に合わないので、後で作る
    return this;
  };


  // clear
  this.clear = function(){
    // 間に合わないので、後で作る
    return this;
  };
}



// ********************
// functions
// ********************
// --------------------
// WEBからマンセル値へ変換
// --------------------
function WEBtoMunsell( web ){

  // TODO そのうち処理つくる

  var result = null;
  result = '5YR10/3';
  return result;
}


// --------------------
// WEBからHSBへ変換
// --------------------
function WEBtoHSB( web ){
  var result = null;
  var hsb = {
    h: 0,
    s: 0,
    b: 0
  };
  var rgb = WEBtoRGB( web );
  var r = rgb.r;
  var g = rgb.g;
  var b = rgb.b;
  var max = Math.max( Math.max( r, g ), b );
  var min = Math.min( Math.min( r, g ), b );

  // hue
  var h = null;
  if( max == min ){
    hsb.h = 0;
  } else if ( max == r ){
    h = 60 * ( g - b ) / ( max - min ) + 0;
    hsb.h = Math.round( h );
  } else if ( max == g ){
    h = 60 * ( b - r ) / ( max - min ) + 120;
    hsb.h = Math.round( h );
  } else if ( max == b ){
    h = 60 * ( r - g ) / ( max - min ) + 240;
    hsb.h = Math.round( h );
  }
  if( hsb.h < 0 ) hsb.h += 360;

  // saturation
  var s = null;
  //hsb.s = max - min;
  if( max != 0 ){
    s = ( max - min ) / max * 255;
    hsb.s = Math.round( s );
  }

  // brightness
  hsb.b = max;

  result = hsb;
  return result;
}


// --------------------
// HSBからWEBへ変換
// --------------------
function HSBtoWEB( hsb ){
  var result = null;
  var rgb = {
    r: 0,
    g: 0,
    b: 0
  };
  var h = hsb.h;
  var s = hsb.s;
  var b = hsb.b;

  if( s == 0 ){
    b = Math.round( b );
    rgb.r = b;
    rgb.g = b;
    rgb.b = b;
    result = RGBtoWEB( rgb );
    return result;
  }

  h = h % 360;
  s = s / 255;

  var i = Math.floor( h / 60 ) % 6;
  var f = ( h / 60 ) - i;
  var p = b * ( 1 - s );
  var q = b * ( 1 - f * s );
  var t = b * ( 1 - ( 1 - f ) * s );

  switch( i ){
    case 0:
      rgb.r = Math.round( b );
      rgb.g = Math.round( t );
      rgb.b = Math.round( p );
      break;

    case 1:
      rgb.r = Math.round( q );
      rgb.g = Math.round( b );
      rgb.b = Math.round( p );
      break;

    case 2:
      rgb.r = Math.round( p );
      rgb.g = Math.round( b );
      rgb.b = Math.round( t );
      break;

    case 3:
      rgb.r = Math.round( p );
      rgb.g = Math.round( q );
      rgb.b = Math.round( b );
      break;

    case 4:
      rgb.r = Math.round( t );
      rgb.g = Math.round( p );
      rgb.b = Math.round( b );
      break;

    case 5:
      rgb.r = Math.round( b );
      rgb.g = Math.round( p );
      rgb.b = Math.round( q );
      break;

    default:
      break;
  }

  result = RGBtoWEB( rgb );
  return result;
}


// --------------------
// WEBからRGBへ変換
// --------------------
function WEBtoRGB( web ){
  var result = {
    r: 0,
    g: 0,
    b: 0
  };
  var web = web[ 0 ] == '#' ? web.slice( 1 ) : web ;
  var length = web.length;
  var r, g, b;

  if( length == 3 ){
    r = web[ 0 ];
    result.r = parseInt( r + r, 16 );

    g = web[ 1 ];
    result.g = parseInt( g + g, 16 );

    b = web[ 2 ];
    result.b = parseInt( b + b, 16 );

  } else if ( length == 6 ){
    r = web.substring( 0, 2 );
    result.r = parseInt( r, 16 );

    g = web.substring( 2, 4 );
    result.g = parseInt( g, 16 );

    b = web.substring( 4, 6 );
    result.b = parseInt( b, 16 );
  }

  return result;
}


// --------------------
// RGBからWEBへ変換
// --------------------
function RGBtoWEB( rgb ){
  var result = null;
  var _r = Math.round( rgb.r );
  var _g = Math.round( rgb.g );
  var _b = Math.round( rgb.b );
  var r = _r.toString( 16 );
  var g = _g.toString( 16 );
  var b = _b.toString( 16 );

  result = [
    '#',
    r.length == 1 ? 0 + r : r,
    g.length == 1 ? 0 + g : g,
    b.length == 1 ? 0 + b : b
  ].join('');

  return result;
}


// --------------------
// 調和判定
// --------------------
function judgeColor( data, statuses, id, webColor ){
  var d = data;
  var s = statuses;
  var colorSpace = d.colorSpace;

  var hueStep = s.hueStep;
  var chromaStep = s.chromaStep;
  var brightnessStep = 10;

  var baseColorId = d.baseColorId;
  var baseColor = null;
  var targetColor = null;

  var b = {};
  var t = {};

  var maxH = null;
  var minH = null;
  var maxS = null;
  var minS = null;
  var maxB = null;
  var minB = null;

  var H = null;
  var S = null;
  var B = null;

  var jndB = null;

  if( colorSpace == 'munsell' || colorSpace == 'rgb+' ){
    baseColor = d.colorStatuses[ baseColorId ].stepNum;
    targetColor = d.colorStatuses[ id ].stepNum;
    b = {
      h: baseColor.hue,
      s: baseColor.chroma,
      b: s.baseColorBrightness * 10 / brightnessStep
    };
    t = {
      h: targetColor.hue,
      s: targetColor.chroma,
      b: targetColor.brightness
    };

    maxH = ( Math.max( b.h, t.h ) - 1 ) * ( 360 / hueStep );
    minH = ( Math.min( b.h, t.h ) - 1 ) * ( 360 / hueStep );
    maxS = Math.max( b.s, t.s ) * 14 / chromaStep;
    minS = Math.min( b.s, t.s ) * 14 / chromaStep;
    maxB = Math.max( b.b, t.b ) * 10 / brightnessStep;
    minB = Math.min( b.b, t.b ) * 10 / brightnessStep;

    H = maxH - minH > 180 ? 360 - maxH + minH : maxH - minH ;
    S = maxS - minS;
    B = maxB - minB;

    jndB = 0.1; // 激しく曖昧…

  } else if ( colorSpace == 'rgb' ){
    baseColor = WEBtoHSB( d.baseColor );
    targetColor = WEBtoHSB( d.colorStatuses[ id ].web );
    b = {
      h: baseColor.h,
      s: baseColor.s,
      b: baseColor.b
    };
    t = {
      h: targetColor.h,
      s: targetColor.s,
      b: targetColor.b
    };

    maxH = Math.max( b.h, t.h );
    minH = Math.min( b.h, t.h );
    maxS = Math.max( b.s, t.s );
    minS = Math.min( b.s, t.s );
    maxB = Math.max( b.b, t.b );
    minB = Math.min( b.b, t.b );

    H = maxH - minH > 180 ? 360 - maxH + minH : maxH - minH ;
    S = chromaStep * ( maxS - minS ) / 255;
    B = brightnessStep * ( maxB - minB ) / 255;

    jndB = brightnessStep / 255;
  }

  // hue
  if( H > 1 && H <= 25 || H > 43 && H <= 100 ){
    return false;
  }

  // saturation
  if( S > 1 && S <= 3 || S > 5 && S <= 7 ){
    return false;
  }

  // brightness
  if( B > jndB && B <= 0.5 || B > 1.5 && B <= 2.5 ){
    return false;
  }

  return true;
}
