(function() {
  var SEVERITY_WARNING = 1;
  var SEVERITY_DANGER  = 2;

  var CHECK_WAITING = 0;
  var CHECK_SUCCESS = 1;
  var CHECK_FAILED  = 2;

  var checksData = [
    { validatorId: "getapi",      severity: SEVERITY_DANGER,   result: CHECK_WAITING, selector: "js-fr-checks" },
    { validatorId: "patchapi",    severity: SEVERITY_DANGER,   result: CHECK_WAITING, selector: "js-fr-checks" },
    { validatorId: "frontrowcdn", severity: SEVERITY_DANGER,   result: CHECK_WAITING, selector: "js-services-checks" },
    { validatorId: "jquery",      severity: SEVERITY_DANGER,   result: CHECK_WAITING, selector: "js-services-checks" },
    { validatorId: "trackjs",     severity: SEVERITY_WARNING,  result: CHECK_WAITING, selector: "js-services-checks" },
    { validatorId: "mixpanel",    severity: SEVERITY_WARNING,  result: CHECK_WAITING, selector: "js-services-checks" },
    { validatorId: "mathjax",     severity: SEVERITY_DANGER,   result: CHECK_WAITING, selector: "js-services-checks" },
    { validatorId: "imgix",       severity: SEVERITY_DANGER,   result: CHECK_WAITING, selector: "js-settings-checks" },
    { validatorId: "tts",         severity: SEVERITY_WARNING,  result: CHECK_WAITING, selector: "js-settings-checks" },
    { validatorId: "browser",     severity: SEVERITY_DANGER,   result: CHECK_WAITING, selector: "js-settings-checks" },
    { validatorId: "screensize",  severity: SEVERITY_DANGER,   result: CHECK_WAITING, selector: "js-settings-checks" },
    { validatorId: "connection",  severity: SEVERITY_WARNING,  result: CHECK_WAITING, selector: "js-settings-checks" },

  ];

  var getBaseAPIsUrl = function () {
    switch (window.location.host) {
      case "techcheck.fragrant.com":
        return "https://api.fragrant.com/";
      case "techcheck.frontrowed.com":
        return "https://api.frontrowed.com/";
      case "techcheck-onebox.frontrowed.com":
        return "https://api-onebox.frontrowed.com/";
      case "techcheck.localhost.com":
        return "https://api.localhost.com/";
      default:
        return console.error("" + window.location.host + " not recognized !!!");
    }
  };

  function getValidatorHelp (validatorId) {
    var blockedPageLink = "<a href='https://frontrowed.zendesk.com/hc/en-us/articles/204650558-Is-there-a-list-of-URLs-that-we-should-whitelist-in-our-firewall-to-make-sure-Front-Row-runs-smoothly-'>Front Row Knowledge Base</a>";
    switch (validatorId) {
      case "tts":
        return "Please use Chrome to have questions read aloud.";
      default:
        return "It appears that your network is blocking a domain required by Front Row. Learn more about it at the " + blockedPageLink;
    }
  }

  function launchAllChecks () {
    var baseAPIsUrl = getBaseAPIsUrl();
    var apiUrl      = baseAPIsUrl + "2";
    var assetsUrl   = "https://classroom-assets.frontrowed.com";
    var imgixUrl    = "https://frontrow-image-assets.imgix.net";

    var ttsAPI      = "http://tts-api.com/tts.mp3";
    var minWidth    = 700;
    var minHeight   = 500;
    var recommendedBrowser = { name: "chrome", major: 42 };
    var browserWhitelist  = [ { name: "chrome",         major: 40 },
                              { name: "firefox",        major: 35 },
                              { name: "safari",         major: 8  },
                              { name: "mobile safari",  major: 5  }];

    var timeout = 15000;

    // Checking querying API
    checkAPI("getapi",              apiUrl + "/connection-check", "GET");
    checkAPI("patchapi",            apiUrl + "/connection-check", "PATCH");

    // Checking fetching assets
    checkGetFile("frontrowcdn",      assetsUrl + "/sample.txt");
    checkGetFile("imgix",            imgixUrl);

    // Checking scripts
    checkScript("jquery",           "jQuery");
    checkScript("trackjs",          "trackJs");
    checkScript("mixpanel",         "mixpanel");
    checkScript("mathjax",          "MathJax");

    // Checking system
    checkTTS("tts",                 ttsAPI);
    checkBrowser("browser",         browserWhitelist, recommendedBrowser);
    checkScreenSize("screensize",   minWidth,         minHeight);

    // Check connection speed
    checkConnectionSpeed("connection", assetsUrl)

    // Timeout will make sure everything worked or display failure
    _.delay(everythingGoodOrFailure, timeout);
  }

  function everythingGoodOrFailure() {
    // Remove the spinner
    $(".js-loader").addClass("hide");
    $(".js-checks-wrapper").removeClass("hide");
    var unfinishedCheck = _.chain(checksData)
    .filter(function (check) {
      return check.result == CHECK_WAITING;
    })
    .forEach(unfinishedCheck, function (check) {
      displayCheckFailed(check.validatorId);
    });
  }

  function checkAPI (validatorId, apiUrl, method) {
    $.ajax({
      dataType: 'json',
      contentType: "application/json; charset=utf8",
      xhrFields: { withCredentials: true },
      url: apiUrl,
      type: method
    })
    .done(function( jqXHR, textStatus, errorThrown ) {
      if (errorThrown.status == "200") {
        displayCheckSucceed(validatorId);
      } else {
        displayCheckFailed(validatorId);
      }
    })
    .fail(function( jqXHR, textStatus, errorThrown ) {
      displayCheckFailed(validatorId);
    });
  }

  function checkGetFile (validatorId, fileUrl) {
    $.ajax({
        url: fileUrl,
        type: 'GET'
    })
    .done(function( jqXHR, textStatus, errorThrown ) {
      if (errorThrown.status == "200") {
        displayCheckSucceed(validatorId);
      } else {
        displayCheckFailed(validatorId);
      }
    })
    .fail(function( jqXHR, textStatus, errorThrown ) {
      displayCheckFailed(validatorId);
    });
  }

  function checkScript (validatorId, scriptObj) {
    if (_.has(window,scriptObj) && !_.isEmpty(window[scriptObj])) {
      displayCheckSucceed(validatorId);
    } else {
      displayCheckFailed(validatorId);
    }
  }

  function checkBrowser (validatorId, browserWhitelist, recommendedBrowser) {
    var uap = UAParser();
    var chromeLink = "<a href='https://www.google.com/chrome/browser'>here</a>";
    if (uap.browser.name && uap.browser.major) {
      var userBrowser = _.find(browserWhitelist, function(browserObj) {
        return browserObj.name.toLowerCase() == uap.browser.name.toLowerCase();
      });

      if (new RegExp(recommendedBrowser.name,'i').test(uap.browser.name)) {
        if (recommendedBrowser.major <= parseInt(uap.browser.major,10)) {
          displayCheckSucceed(validatorId);
        } else {
          displayCheckFailed(validatorId, SEVERITY_WARNING,
            "You have Chrome version " + uap.browser.major +". A new version of Chrome is available" + chromeLink);
        }
      }
      else if (userBrowser) {
        if (userBrowser.major <= parseInt(uap.browser.major,10)) {
          displayCheckFailed(validatorId, SEVERITY_WARNING,
            "Front Row works best on Chrome. You can download it " + chromeLink);
        } else {
          displayCheckFailed(validatorId, SEVERITY_DANGER,
            "Your browser is not supported. Please download Chrome " + chromeLink);
        }
      } else {
        displayCheckFailed(validatorId, SEVERITY_DANGER,
            "Your browser is not supported. Please download Chrome " + chromeLink);
      }
    } else {
      console.log("couldn't find the browser");
    }
  }

  function checkTTS (validatorId, ttsApiUrl) {
    var uap = UAParser();
    if (Modernizr.speechsynthesis && !uap.os.name.match(/android/i)) {
      displayCheckSucceed(validatorId);
    } else {
      var audio = document.createElement('audio');
      audio.setAttribute('src', ttsApiUrl + "?q=" + encodeURIComponent("test"));
      audio.addEventListener('error',
        function (e) {
          displayCheckFailed(validatorId);
        }, true);
      audio.load();
    }
  }

  function checkScreenSize (validatorId, minWidth, minHeight) {
    var screenWith = $(window).width();
    var screenHeight = $(window).height();
    var failed = false;
    if (screenWith < minWidth) {
      displayCheckFailed(validatorId, null, "You screen is too narrow to execute Front Row");
      failed = true;
    }
    if (screenHeight < minHeight) {
      displayCheckFailed(validatorId, null, "You screen is too small to execute Front Row");
      failed = true;
    }
    if (screenWith < screenHeight) {
      displayCheckFailed(validatorId, null, "Please use your screen on landscape mode");
      failed = true;
    }
    if (!failed) {
      displayCheckSucceed(validatorId);
    }
  }

  function checkConnectionSpeed(validatorId, assetsUrl) {
    var startTime = new Date().getTime();
    var picture = new Image();
    picture.onload = function () {
      var endTime = new Date().getTime();
      var duration = (endTime - startTime) / 1000;
      if (duration > 5) {
        displayCheckFailed(validatorId, null, "Your connection is slow. Your may experience slowness with Front Row.");
      } else {
        displayCheckSucceed(validatorId);
      }
    }
    // This is a 3.4MB picture
    picture.src =  assetsUrl + "/test.png" + "?n=" + Math.random();
  }


  // VIDEO BUTTONS HANDLERS

  $(".js-video-check-fail").click(function (e) {
    var $btn = $(e.currentTarget);
    var $callout = $btn.parents(".bs-callout");
    var $icon = $callout.find(".js-icon-warning");
    var $videoDetails = $callout.find(".js-video-details");
    var $videoSolution = $callout.find(".js-video-solution");
    var videoType = $callout.data("video-type");
    $callout.addClass("bs-callout-warning");
    $videoDetails.empty();
    $videoSolution.removeClass("hide");
    $icon.removeClass("hide");
    updateSummary("warning");
    updateReportEmail(videoType);
  });

  $(".js-video-check-success").click(function (e) {
    var $btn = $(e.target);
    var $callout = $btn.parents(".bs-callout");
    var $icon = $callout.find(".js-icon-success");
    var $videoDetails = $callout.find(".js-video-details");
    $callout.addClass("bs-callout-success");
    $videoDetails.empty();
    $icon.removeClass("hide");
    updateSummary("success");
  });

  // DISPLAY RESULTS FUNCTIONS

  function displayCheckSucceed (validatorId) {
    var checkData = _.find(checksData, function (check) {
      return check.validatorId === validatorId;
    });
    checkData.result = CHECK_SUCCESS;
    var resultContainer = $("." + checkData.selector);

    if (!resultContainer.hasClass("bs-callout-danger") &&
        !resultContainer.hasClass("bs-callout-warning")) {
      resultContainer.addClass("bs-callout-success");
      resultContainer.find(".js-icon-success").removeClass("hide");
    }
    updateSummary("success");
  }

  function displayCheckFailed (validatorId, optSeverity, optMessage) {
    var checkData = _.find(checksData, function (check) {
      return check.validatorId === validatorId;
    });
    checkData.result = CHECK_FAILED;
    var resultContainer = $("." + checkData.selector);
    var severity = optSeverity ? optSeverity : checkData.severity;

    var help = optMessage ? optMessage : getValidatorHelp(validatorId);
    var $newHelpInfoP = $( '<p">' + help + '</p>');
    var $helpDiv = resultContainer.find(".js-help");
    resultContainer.removeClass("bs-callout-success");
    resultContainer.find(".js-icon-success").addClass("hide");

    if (severity === SEVERITY_DANGER) {
      resultContainer.addClass("bs-callout-danger");
      resultContainer.find(".js-icon-danger").removeClass("hide");
      updateSummary("failed");
    } else {
      resultContainer.addClass("bs-callout-warning");
      resultContainer.find(".js-icon-warning").removeClass("hide");
      updateSummary("warning");
    }
    // Add the validator in the email body
    updateReportEmail(validatorId);
    // Add help to block
    if (!$helpDiv.hasClass("bs-callout-help")) {
      $helpDiv.addClass("bs-callout-help");
    }
    resultContainer.find(".js-help").append($newHelpInfoP);
  }

  function updateSummary (status) {
    var startDiv    = $(".js-callout-summary");
    var failedDiv   = $(".js-callout-summary-failed");
    var warningDiv  = $(".js-callout-summary-warning");
    var successDiv  = $(".js-callout-summary-success");

    if (!startDiv.hasClass("hide")) {
      startDiv.addClass("hide");
    }
    if (status == "success" &&
        failedDiv.hasClass("hide") &&
        warningDiv.hasClass("hide")) {
        successDiv.removeClass("hide");
    }
    if (status == "warning") {
      if (!successDiv.hasClass("hide")) {
        successDiv.addClass("hide");
      }
      if (failedDiv.hasClass("hide")) {
        warningDiv.removeClass("hide");
      }
    }
    if (status == "failed") {
      if (!successDiv.hasClass("hide")) {
        successDiv.addClass("hide");
      }
      if (!warningDiv.hasClass("hide")) {
        warningDiv.addClass("hide");
      }
      failedDiv.removeClass("hide");
    }
  }

  // EMAIL REPORT FUNCTIONS

  function initializeReportEmail () {
    var uap = UAParser();
    var body = $(".js-frontrow-email-link").attr("href");
    var d = new Date();
    var newBody = body + "%0A%0A" + d.toString() + "%0A%0A" +
      "User Agent: " + uap.ua + "%0A%0A" +
      "Screen Size: " + window.screen.width + "px - " + window.screen.height + "px";
    $(".js-frontrow-email-link").attr("href", newBody);
  }

  function userFriendlyValidator (validatorId) {
    switch (validatorId) {
      case "getapi":      return "Fetching information from Front Row";
      case "patchapi":    return "Sending information to Front Row";
      case "frontrowcdn": return "Fetching information from Front Row Amazon";
      case "jquery":      return "Fetching jQuery library";
      case "trackjs":     return "Sending information to TrackJs";
      case "mixpanel":    return "Sending information to MixPanel";
      case "mathjax":     return "Fetching MathJax library";
      case "imgix":       return "Fetching information from Imgix";
      case "tts":         return "Fetching jQuery library";
      case "browser":     return "Use Front Row on my browser";
      case "screensize":  return "Use Front Row on my device";
      case "timeout":     return "Connection timeout";
      default:            return "Unknown";
    }
  }

  function updateReportEmail (validatorId) {
    var body = $(".js-frontrow-email-link").attr("href");
    var newBody = body + "%0A%0AFAILURE: " + userFriendlyValidator(validatorId);
    $(".js-frontrow-email-link").attr("href", newBody);
  }

  initializeReportEmail();
  // Launch tests
  launchAllChecks();
})();
