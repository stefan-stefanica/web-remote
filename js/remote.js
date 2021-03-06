// Global variables
$currentTabID = -1;
$tabsList = [];
var slider = null;
var provider = new firebase.auth.GoogleAuthProvider();

// Initialize
initializeFirebase();
initializeVolumeSlider();

// Update the tabs 
function updateTabs(list, iframes) {
    var container = document.getElementById("openedTabsList");
    var iframesContainer = document.getElementById("iframesList");
    var html = "";
    var htmlIframe = "";
    $tabsList = [];

    if (list.length > 0) {
        // If the list of tabs contains at least 1 tab, display them
        for (var item in list) {
            var element = list[item];
            // Display each tab 
            html += `<div class="input-group mb-3">
                        <input type="text" class="form-control focusTabButton" data-tabID="` + element.id + `" readonly value="` + element.title + `">
                        <div class="input-group-append">
                            <button class="btn btn-outline-secondary closeTabButton" type="button" data-tabID="` + element.id + `">X</button>
                        </div>
                    </div>`;

            // If the tab is active change the UI accordingly
            if (element.active){
                $currentTabID = element.id;
                
                // Change Play button text
                document.getElementById("playButton").innerHTML = element != null && element.audible ? "Pause Video" : "Play Video";
                // Enable/Disable play button             
                document.getElementById("playButton").disabled = element == null ? true : false;
                // Show/hide error message
                document.getElementById("activeTab").innerHTML = element == null ? "You must select a video tab first" : "<b>" + element.title + "</b>";  
                // Enable/Disable rewind buttons
                element == null ? enableRewindButtons(false) : enableRewindButtons(true);  
            }

            // Add the tabs to the local list
            $tabsList.push(element);
        }
    } else {
        // Display a default message when there is no video tab
        html += `<div>You have no video tabs</div>`;
    }

    if (iframes.length > 0) {
        htmlIframe += `<div class="mt-5 mb-3">Active tabs with iframes</div>`;

        // If the list of iframes contains at least 1 iframe, display it
        for (var item in iframes) {
            var element = iframes[item];
            var value = "width: " + element.width + " height: " + element.height + " \n" + element.source;

            // Display each tab 
            htmlIframe += `<div class="input-group mb-3">
                                <textarea type="text" class="form-control iframe-textarea" readonly>` + value + `</textarea>
                                <div class="input-group-append">
                                    <button class="btn btn-outline-secondary iframeButton" type="button" data-src="` + element.source + `">+</button>
                                </div>
                            </div>`;
        }
    } else {
        // Display a default message when there is no video tab
        htmlIframe += `<div>You have no iframe tabs</div>`;
    }

    // Apply the changes
    container.innerHTML = html;
    iframesContainer.innerHTML = htmlIframe;

    Array.from(container.getElementsByClassName("closeTabButton")).forEach(element => {
        // Add event listeners for "close" buttons
        element.addEventListener("click", function(params) {
            var tabID = this.getAttribute("data-tabID");
            
            // Send command to close the tab
            closeTab(tabID);
        });
    });

    Array.from(container.getElementsByClassName("focusTabButton")).forEach(element => {
        // Add event listeners for "focus" buttons
        element.addEventListener("click", function(params) {
            this.blur();
            var tabID = this.getAttribute("data-tabID");
            
            // Send command to change the tab
            changeTab(tabID);
        });
    });

    Array.from(iframesContainer.getElementsByClassName("iframeButton")).forEach(element => {
        // Add event listeners for "new tab from iframe" buttons
        element.addEventListener("click", function(params) {
            this.blur();
            var source = this.getAttribute("data-src");
            
            newTab(source);
        });
    });
}

// Change the UI when the tab has changed
function setCurrentTabID(id) {
    $currentTabID = id;
    var tab = getTabById(id);

    // Change Play button text
    document.getElementById("playButton").innerHTML = tab != null && tab.audible ? "Pause Video" : "Play Video"; 
    // Enable/Disable play button  
    document.getElementById("playButton").disabled = tab == null ? true : false;
    // Show/hide error message
    document.getElementById("activeTab").innerHTML = tab == null ? "You must select a video tab first" : "<b>" + tab.title + "</b>";  
    // Enable/Disable rewind buttons
    tab == null ? enableRewindButtons(false) : enableRewindButtons(true);  
}

// Change the UI when the audible has changed (sound)
function setAudibleChanged(id, audible) {
    var tab = getTabById(id);

    // Change Play button text
    document.getElementById("playButton").innerHTML = tab != null && audible ? "Pause Video" : "Play Video";
}

// Enable/Disable seek buttons
function enableRewindButtons(enabled) {
    // Rewind buttons
    document.getElementById("rewind1").disabled 
    = document.getElementById("rewind2").disabled
    = document.getElementById("forward1").disabled
    = document.getElementById("forward2").disabled 
    = !enabled;

    // Volume buttons
    document.getElementById("volumeButton").disabled = !enabled;
}

// Initialize volume
function initializeVolumeSlider() {
    slider = new Slider('#volumeSlider');

    slider.on("slideStop", function (params) {
        changeVolume($currentTabID, parseInt(params) / 100);
    })
}

// Show volume
function showVolume() {
    document.getElementById("playButton").style.display = "none";
    document.getElementById("volumeContainer").style.display = "block";
}

// Hide volume
function hideVolume() {
    document.getElementById("playButton").style.display = "block";
    document.getElementById("volumeContainer").style.display = "none";
}

// Volume button click
function toggleVolume() {
    if (document.getElementById("playButton").style.display == "none") {
        hideVolume();
    } else {
        showVolume();
    }
}

// Update list of peers
function updateListOfPeers(peers) {
    console.log("update peers", peers)
    var container = document.getElementById("devices");
    var html = ``;

    if (peers.length > 0) {
        for (let i = 0; i < peers.length; i++) {
            const element = peers[i];
            html += `<button class="peerConnectButton btn btn-success btn-block mb-3" type="button" data-peerId="${element.peerId}">${element.osName}</button>`;        
        }

        container.innerHTML = html;

        Array.from(container.getElementsByClassName("peerConnectButton")).forEach(element => {
            element.addEventListener("click", function (params) {
                var peerId = element.getAttribute("data-peerId");
                console.log(peerId)
                connectToPeer(peerId);
            })
        });
    } else {
        // No peers 
        container.innerHTML = "You have no devices connected";
    }
}

// Open and process QR Code image
function openQRCamera(node, elementID) {
    var reader = new FileReader();

    reader.onload = function() {
        node.value = "";

        qrcode.callback = function(res) {
            if(res instanceof Error) {
                // Error - QR code couldn't be found
                alert("No QR code found. Please make sure the QR code is within the camera's frame and try again.");
            } else {
                // QR code was found
                elementID.value = res;
            }
        };

        qrcode.decode(reader.result);
    };

    reader.readAsDataURL(node.files[0]);
}

// Get tab by id, from local tab list
function getTabById(id) {
    var tab = null;

    for (const key in $tabsList) {
        const element = $tabsList[key];
        if (element.id == id) {
            tab = element;
            break;
        }
    }

    return tab;
}

// Initialize Firebase
function initializeFirebase() {
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyDn-CWzNRnQM5TvjKMIiho_zwpFivRaBNQ",
        authDomain: "browsercast-1550137004565.firebaseapp.com",
        databaseURL: "https://browsercast-1550137004565.firebaseio.com",
        projectId: "browsercast-1550137004565",
        storageBucket: "browsercast-1550137004565.appspot.com",
        messagingSenderId: "209745942759"
    };
    firebase.initializeApp(config);
}

// Connect with Google
function connectGoogle() {
    firebase.auth().signInWithPopup(provider).then(function(result) {
        // Signed in (handled by onAuthStateChanged)
    }).catch(function(error) {
        // Error occurred
        console.log(error);
    });
}

function disconnectGoogle() {
    firebase.auth().signOut().then(function(result) {
        disconnectSocket();
    }).catch(function(error) {
        // Error occurred
        console.log(error);
    });
}

// Login status changed
firebase.auth().onAuthStateChanged(function(user) {
    if (user != undefined) {
        socialConnectionStarted(user);
        connect(undefined, user.uid);
    } else {
        socialConnectionEnded();
    }
});

// Add event listener for volume buttons
document.getElementById("volumeButton").addEventListener("click", toggleVolume);

// Add event listener for Google connect button
document.getElementById("googleButton").addEventListener("click", connectGoogle);

// Add event listener to "Play" button
document.getElementById("playButton").addEventListener("click", function(params) {
    // FixMe - adding an attribute on playButton which will show the status
    document.getElementById("playButton").innerHTML = document.getElementById("playButton").innerHTML == "Play Video"? "Pause Video" : "Play Video";
    playTab($currentTabID);    
});

// Add event listener to "New tab" button
document.getElementById("newTabButton").addEventListener("click", function(params) {
    newTab(urlInput.value);
});

// Add event listener for "scan" button
document.getElementById("scanButton").addEventListener("change", function() {
    openQRCamera(this, document.getElementById("connectInput"));
});

// Add event listener for "connect" button
document.getElementById("connectButton").addEventListener("click", function() {
    var code = document.getElementById("connectInput").value;

    if (code.length < 10) {
        alert("Your code is too short");
    } else {
        // If code is valid send connect command
        connect(code); 
    }  
});

// Add event listener for "disconnect" button
document.getElementById("disconnectButton").addEventListener("click", function() {
    // Disconnect the user
    disconnect();
});

// Rewind video 1
document.getElementById("rewind1").addEventListener("click", function() {
    seekVideo($currentTabID, -60);
});

// Rewind video 2
document.getElementById("rewind2").addEventListener("click", function() {
    seekVideo($currentTabID, -180);
});

// Forward video 1
document.getElementById("forward1").addEventListener("click", function() {
    seekVideo($currentTabID, 60);
});

// Forward video 2
document.getElementById("forward2").addEventListener("click", function() {
    seekVideo($currentTabID, 180);
});