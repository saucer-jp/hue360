export function getUserInfo(userAgent = window.navigator.userAgent.toLowerCase()) {
  const user = {
    agent: userAgent,
    info: [],
  };

  if (/ipod/.test(user.agent)) {
    user.info.push('ipod');
  } else if (/ipad/.test(user.agent)) {
    user.info.push('ipad');
  } else if (/iphone/.test(user.agent)) {
    user.info.push('iphone');
  } else if (/android/.test(user.agent)) {
    user.info.push('android');
  } else if (/windows phone/.test(user.agent)) {
    user.info.push('win-phone');
  } else if (/blackberry/.test(user.agent)) {
    user.info.push('blackberry');
  } else {
    user.info.push('pc');
  }

  if (/windows/.test(user.agent)) {
    user.info.push('win');
    if (/windows nt 5\.1/.test(user.agent)) {
      user.info.push('xp');
    } else if (/windows nt 6\.0/.test(user.agent)) {
      user.info.push('vista');
    } else if (/windows nt 6\.1/.test(user.agent)) {
      user.info.push('win7');
    } else if (/windows nt 6\.2/.test(user.agent)) {
      user.info.push('win8');
    }
  } else if (/mac/.test(user.agent)) {
    user.info.push('mac');
    if (/iphone|ipad|ipod/.test(user.agent)) {
      user.info.push('ios');
    }
  } else if (/linux/.test(user.agent)) {
    user.info.push('linux');
  }

  if (/trident/.test(user.agent)) {
    user.info.push('trident');
  } else if (/webkit/.test(user.agent)) {
    user.info.push('webkit');
  } else if (/gecko/.test(user.agent)) {
    user.info.push('gecko');
  }

  if (/msie/.test(user.agent)) {
    user.info.push('ie');
    if (/msie 6/.test(user.agent)) {
      user.info.push('ie6');
    } else if (/msie 7/.test(user.agent)) {
      user.info.push('ie7');
    } else if (/msie 8/.test(user.agent)) {
      user.info.push('ie8');
    } else if (/msie 9/.test(user.agent)) {
      user.info.push('ie9');
    } else if (/msie 10/.test(user.agent)) {
      user.info.push('ie10');
    }
  } else if (/chrome/.test(user.agent)) {
    user.info.push('chrome');
  } else if (/safari/.test(user.agent)) {
    user.info.push('safari');
  } else if (/firefox/.test(user.agent)) {
    user.info.push('firefox');
  } else if (/opera/.test(user.agent)) {
    user.info.push('opera');
  }

  return user;
}
