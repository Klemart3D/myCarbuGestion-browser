var app = {
    // Application constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready event handler
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
    },

    // Update DOM on a received event
    receivedEvent: function(id) {
        if(localStorage != undefined) {
            app.reloader();
            app.toggleNavBar(window.location.hash);

            // Change tab smoothing
            $(".nav-toggle ").bind('click', function(e){
                var $anchor = $(this);
                $('html, body').stop().animate({
                    scrollLeft: $($anchor.attr('href')).offset().left
                }, 300);
                app.toggleNavBar($(this).attr('href'));
                e.preventDefault();           
            });

            // User updating fuel quantity
            $("#fuelqtt").on("change paste keyup", function() {
                if ($(this).val()) {
                    app.ajaxFuelQtt(parseFloat($(this).val()));
                    if ($("#ratio").val()) {
                        app.updatePrice();
                    }
                }
            });

            // User updating fuel price
            $("#ratio").on("change paste keyup", function() {
                if ($(this).val()) {
                    app.ajaxRatio(parseFloat($(this).val()));
                    if ($("#fuelqtt").val()) {
                        app.updatePrice();
                    }
                }
            });

            // Add a new refueling
            $("#submit").on('click', function (e) {
                var kmttl = $("#kmttl").val();
                var fuelqtt = $("#fuelqtt").val();
                var ratio = $("#ratio").val();
                var price = $("#price").val();
                var station = $("#station").val();
                var fueltype = $("#fueltype").val();

                if (kmttl == "" || fuelqtt == "" || ratio == "" || price == "") {
                    alert("Vous n'avez pas rempli tous les champs !");
                    return;
                }

                if (localStorage.length > 0) {
                    var consumption = app.getConsumption(fuelqtt, kmttl);
                } else {
                    var consumption = 0;
                }

                var date = + new Date();

                var refueling = {
                    date: date,
                    kmttl: parseFloat(kmttl),
                    fuelqtt: parseFloat(fuelqtt),
                    ratio: parseFloat(ratio),
                    price: parseFloat(price),
                    station: station,
                    fueltype: fueltype,
                    consumption: parseFloat(consumption)
                };
                localStorage.setItem(localStorage.length, JSON.stringify(refueling));
                app.showMessage("Votre plein a été ajouté avec succès !");
                app.reloader();
            });

            // Generate a false refueling
            $("#generate").on('click', function (e) {
                var date = + new Date();
                var fuelqtt = parseFloat(Math.random() * (60 - 20) + 20).toFixed(2);
                var ratio = (Math.random() * (2 - 1) + 1).toFixed(3);
                var price = app.getPriceRefueling(fuelqtt, ratio);

                if (localStorage.length > 0) {
                    var kmttl = app.getPreviousKmttl() + Math.floor(Math.random() * (700 - 500)) + 500;
                    var consumption = app.getConsumption(fuelqtt, kmttl);
                } else {
                    var kmttl = Math.floor(Math.random() * (200000 - 110000)) + 110000;
                    var consumption = 0;
                }
                var refueling = {
                    date: date,
                    kmttl: parseFloat(kmttl),
                    fuelqtt: parseFloat(fuelqtt),
                    ratio: parseFloat(ratio),
                    price: parseFloat(price),
                    station: "Ma Super Station",
                    fueltype: "SP98",
                    consumption: parseFloat(consumption)
                };
                localStorage.setItem(localStorage.length, JSON.stringify(refueling));
                app.showMessage("Faux-plein généré avec succès !");
                app.reloader();
            });

            // Delete data
            $("#delete").on('click', function (e) {
                if (confirm("Êtes-vous sûr de vouloir supprimer tous vos pleins ?")) {
                    localStorage.clear();
                    app.reloader();
                }
            });

            // Export data file
            $("#getDataFile").on('click', function (e) {
                app.exportToCsv("data_myCarbuGestion.csv", app.getDataForCsv());
            });
 
        } else {
          alert("localStorage non supporté sur votre périphérique");
        }
    },

    ajaxFuelQtt: function(value) {
        if (value > 0) {
            tmp_fuelqtt = value; 
        }
        return tmp_fuelqtt;
    },

    ajaxRatio: function(value) {
        if (value > 0) {
            tmp_ratio = value;
        }
        return tmp_ratio;
    },
    
    // Auto-update price from fuel price and quantity
    updatePrice: function() {
        var tmp_price = parseFloat(app.ajaxRatio() * app.ajaxFuelQtt()).toFixed(2)
        $("#price").val(tmp_price);
    },

    // Drawing graphs at first time
    drawGraphs: function() {
        $("#chartConsumption").empty();
        $("#chartPrice").empty();
        this.graphConsumption = new Morris.Area({
            element: 'chartConsumption', // <div> ID for graph
            data: app.getData(), // Data
            xkey: 'kmttl', // Hztl axe
            ykeys: ['consumption'], // Vertical axe
            labels: ["Consommation"], // Label
            xLabelFormat: function(x) {
                return x.label + " km";
            },
            parseTime: false,
            postUnits: [' L/100 km'], // Unit
            fillOpacity: [0.5], // Opacity
            resize: true, // Auto-resize
            hoverCallback: function (index, options, content, row) {
                return content;
            }
        });
        
        this.graphPrice = new Morris.Area({
            element: 'chartPrice', // <div> ID for graph
            data: app.getData(), // Data
            xkey: 'date', // Hztl axe
            ykeys: ['ratio'], // Vertical axe
            labels: ["Prix au litre"], // Label
            dateFormat: function(d) {
                var d = new Date(d);
                return d.getDate() + ' ' + app.getFullMonth(d.getMonth()) + ' ' + d.getFullYear();
            },
            lineColors: ['#d68b20'],
            postUnits: [' €'], // Unit
            fillOpacity: [0.5], // Opacity
            resize: true, // Auto-resize
            hoverCallback: function (index, options, content, row) {
                return content + "<hr>Station : <b>" + row.station + "</b><br>Carburant : <b>" + row.fueltype + "<b>";
            }
        });
    },

    // Updating graphs each data change
    refreshGraphs: function() {
        this.graphConsumption.setData(app.getData());
        this.graphPrice.setData(app.getData());
    },

    // Refresh all app data
    reloader: function() {
        if (app.getData() !== false) {
            // Hide "no data"
            $("#no-data").hide();
            $("#data-ok").show();
            // Stats
            $("#stats-kmttl").text(app.getTtlTraveled() + "\xa0km");
            $("#stats-spend").text(app.getTtlSpend() + "\xa0€");
            $("#stats-qtt").text(app.getTtlQtt() + "\xa0L");
            $("#stats-consume").text(app.getTtlConsumed() + "\xa0L/100\xa0km");
            // Graphs
            if (($("#chartPrice").is(':empty')) && ($("#chartPrice").is(':empty'))) {
                app.drawGraphs();
            } else {
                app.refreshGraphs();
            }
        } else {
            $("#no-data").show();
            $("#data-ok").hide();
        }
        // Clear form
        $("#add-refueling")[0].reset();
    },

    // Funky sliding navbar
    toggleNavBar: function(idUrl) {
        $("#nav-line").css("visibility", "visible");
        if (idUrl == "#stats") {
            $("#nav-line").css("margin-left","33.33%");
        } else if (idUrl == "#about") {
            $("#nav-line").css("margin-left","66.66%");
        } else {
            $("#nav-line").css("margin-left","0%");
            $(window).scrollTop($("#new").offset().top).scrollLeft($("#new").offset().left);
        }  
    },

    // Display messages in app for user
    showMessage: function(message) {
        $("#message").show(400).fadeIn(400).html(message);
        setTimeout(function(){
            $("#message").hide(400).fadeOut(400).html(" ");
        }, 3000);
    },

    // Get full month name in french
    getFullMonth: function(day) {
        var month = new Array();
        month[0] = "janvier";
        month[1] = "février";
        month[2] = "mars";
        month[3] = "avril";
        month[4] = "mai";
        month[5] = "juin";
        month[6] = "juillet";
        month[7] = "août";
        month[8] = "septembre";
        month[9] = "octobre";
        month[10] = "novembre";
        month[11] = "décembre";
        return month[day]; 
    },

    getPriceRefueling: function(fuelqtt, ratio) {
        return parseFloat(fuelqtt * ratio).toFixed(2);
    },

    getFirstKmttl: function() {
        return parseFloat(JSON.parse(localStorage[0]).kmttl);
    },

    getPreviousKmttl: function() {
        var prevIndex = (localStorage.length - 1);
        return parseFloat(JSON.parse(localStorage.getItem(prevIndex)).kmttl);
    },

    getKmTraveledFromLastRefueling: function(kmttl) {
        return parseFloat(kmttl - this.getPreviousKmttl());
    },

    getConsumption: function(fuelqtt, kmttl) {
        return parseFloat(((fuelqtt * 100) / this.getKmTraveledFromLastRefueling(kmttl))).toFixed(3);
    },

    getTtlTraveled: function() {
        return parseInt(app.getPreviousKmttl() - app.getFirstKmttl());
    },

    getTtlSpend: function() {
        var spend = 0;
        for (i = 0; i < localStorage.length; i++) {
            spend += JSON.parse(localStorage.getItem(i)).price;
        }
        return parseFloat(spend).toFixed(2).replace('.', ',');
    },

    getTtlQtt: function() {
        var qtt = 0;
        for (i = 0; i < localStorage.length; i++) {
            qtt += JSON.parse(localStorage.getItem(i)).fuelqtt;
        }
        return parseFloat(qtt).toFixed(2).replace('.', ',');
    },

    getTtlConsumed: function() {
        var conso = 0;
        for (i = 1; i < localStorage.length; i++) {
            conso += JSON.parse(localStorage.getItem(i)).consumption;
        }
        conso_avg = conso / (localStorage.length - 1);
        return isNaN(conso_avg) ? 0 : parseFloat(conso_avg).toFixed(2).replace('.', ',');
    },

    // Return array of localStorage for graphs
    getData: function() {
        if (typeof localStorage !== undefined && localStorage !== null && localStorage.length > 0) {
            var finalArray = [];
            for (key = 0; key < localStorage.length; key++) {
                // console.log("LocalStorage : " + key + ' : ' + localStorage[key]);
                var refuelObject = JSON.parse(localStorage.getItem(key));
                finalArray.push(refuelObject);
            }
            return finalArray; // localStorage as an Array of objects
        } else {
            return false;
        }
    },

    // Return array of localStorage for CSV
    getDataForCsv: function() {
        var ls_arr = [];
        for(key = 0; key < localStorage.length; key++){
            lsObj = JSON.parse(localStorage.getItem(key).split(","));
            if (key == 0) ls_arr[key] = Object.keys(lsObj);
            ls_arr[parseInt(key)+1] = Object.values(lsObj);
        }

        return ls_arr; // localStorage as an Array of arrays with headers
    },

    exportToCsv: function(filename, array) {
        var stringifyRow = function (row) {
            var finalVal = '';
            for (var j = 0; j < row.length; j++) {
                var innerValue = row[j] === null ? '' : row[j].toString();
                if (row[j] instanceof Date) {
                    innerValue = row[j].toLocaleString();
                };
                var result = innerValue.replace(/"/g, '""');
                if (result.search(/("|,|\n)/g) >= 0)
                    result = '"' + result + '"';
                if (j > 0)
                    finalVal += ',';
                finalVal += result;
            }
            return finalVal + '\n'; // string
        };

        var csv_content = '';
        // var csvContent = "data:text/csv;charset=utf-8,";
        for (var i = 0; i < array.length; i++) {
            csv_content += stringifyRow(array[i]);
        }        

        var CsvBlob = new Blob([csv_content], { type: 'text/csv;charset=utf-8;' });
        var CsvFile = new File([CsvBlob], filename);

        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(CsvBlob, filename);
        }
        else if (device.platform == "browser") {
            var link = document.createElement("a"); // FF link must be added to DOM to be clicked
            if (link.download !== undefined) { // detection for browser supporting HTML5 download attribute
                link.setAttribute("href", window.URL.createObjectURL(CsvBlob));
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click(); // IE: "Access is denied";
                document.body.removeChild(link);
            }
        }
        else {
            cordova.plugins.email.isAvailable(function (isAvailable) {
                cordova.plugins.email.open({
                    to:      '',
                    subject: 'Mes données myCarbuGestion',
                    body:    'Regardez donc en pièce-jointe ;)',
                    attachments: 'base64:' + filename + '//' + Base64.encode(csv_content)
                });
            })
        }
    },
};

// Base64 encode / decode (http://www.webtoolkit.info)
var Base64 = {
 
    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
    // public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = Base64._utf8_encode(input);
 
        while (i < input.length) {
 
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
 
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
 
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
 
            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
        }
 
        return output;
    },
 
    // public method for decoding
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
        while (i < input.length) {
 
            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));
 
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
 
            output = output + String.fromCharCode(chr1);
 
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
 
        }
 
        output = Base64._utf8_decode(output);
 
        return output;
 
    },
 
    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
 
        for (var n = 0; n < string.length; n++) {
 
            var c = string.charCodeAt(n);
 
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
 
        }
 
        return utftext;
    },
 
    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
 
        while ( i < utftext.length ) {
 
            c = utftext.charCodeAt(i);
 
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
 
        }
 
        return string;
    }
}

var tmp_fuelqtt; // data stored for ajax request
var tmp_ratio; // data stored for ajax request
app.initialize();