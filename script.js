/**
 * Redactle++
 *
 * Chrome extension to add various bits of functionality to Redactle.
 * Credit for this comes from multiple user scripts and Reddit by
 * Kkevsterrr, smrq, gauss256, and more.
 *
 * Features:
 *  - Adds word counts to redacted words
 *  - Adds ability to generate random games
 *  - Adds custom or specific games
 */
(function() {
    'use strict';
    // Wait up to 5 s for the page to be complete.
    var i = 0;
    var redacts = [];
    var maxLoopCount = 50;
    var delayPerLoop = 100;

    /**
     * Waits for baffled text to appear to give the redacted page time to build.
     */
    function waitForPageCompletion() {
        setTimeout(function () {
            redacts = document.getElementsByClassName("baffled");
            if (redacts.length == 0) { // not ready yet
                if (i < maxLoopCount) {
                    i++;
                    waitForPageCompletion(); // wait some more
                }
                else {
                    console.log(`Redacted not complete after ${i * delayPerLoop} ms`);
                }
            }
            else { // now it's ready
                console.log(`Redacted complete after ${i * delayPerLoop} ms`);
                addLetterCount();
            }
        }, delayPerLoop);
    }


    /**
     * Adds letter counts to all the redacted text.
     */
    function addLetterCount() {
        redacts = document.getElementsByClassName("baffled");
        for (let i = 0; i < redacts.length; i++) {
            let redact = redacts[i];
            let count = redact.innerHTML.length;
            let idxStart = count.toString().length;
            let ihOld = redact.innerHTML.substring(idxStart);
            let ihNew = `<span style="color: #606060">${count}</span>${ihOld}`;
            redact.innerHTML = ihNew;
        }

        // Display letter count to the right of the userGuess input field
        // https://www.reddit.com/r/Redactle/comments/uui6kg/redactle_count_display

        $('#userGuess').keyup(function () {
            $('#guessCount').text($(this).val().length > 0 ? $(this).val().length : '');
        });
    }

    /**
     * Build a custom game given an article slug.
     */
    async function LoadCustom(game) {
        if (!game || '') return;

        var winText = document.getElementById("winText");
        var userGuess = document.getElementById('userGuess');
        var guessLogBody = document.getElementById('guessLogBody');

        window.SaveProgress = function SaveProgress() {}
        window.WinRound = function WinRound(){
            document.getElementById("userGuess").disabled = true;
            if(!pageRevealed){
                RevealPage();
            }
            winText.innerHTML = `<h3>Congratulations, you solved this custom Redactle!</h3><ul><li>The answer was: ${ansStr}</li><li>You solved it in ${guessedWords.length} guesses</li><li>Your accuracy was ${currentAccuracy}%</li></ul>`;
            winText.style.display = 'block';
            winText.style.height = 'auto';
        }

        baffled = [];
        guessedWords = [];
        guessCounter = 0;
        hitCounter = 0;
        currentAccuracy = -1;
        pageRevealed = false;

        userGuess.disabled = false;
        winText.innerHTML = '';
        // Keep hiding win text when vic.php is slow and returns after loading a custom game
        winText.style.height = 0;
        winText.style.overflow = 'hidden';
        guessLogBody.innerHTML = '';

        await fetchData(false, game);
        waitForPageCompletion();
    }

    /**
     * Generate a custom game by pulling from Wikipedia's Vital Articles.
     */
    async function generateGame() {
        var arts = "https://en.wikipedia.org/w/api.php?action=parse&format=json&page=Wikipedia:Vital%20articles&prop=text&formatversion=2&origin=*";
        //console.log("Generating new Redactle...")
        await fetch(arts).then(resp => {
            if (!resp.ok) {
                throw `Server error: [${resp.status}] [${resp.statusText}] [${resp.url}]`;
            }
            return resp.json();
        }).then(a => {
            //console.log("Pulled Wikipedia top 1,000...")
            var options = [];
            var el = document.createElement( 'html' );
            el.innerHTML = a.parse.text
            $('a', el).each(function( idx) {
                var data = $(this).attr("href");
                if (data != undefined && data.indexOf("wiki") != -1 && data.indexOf(".svg") == -1 && data.indexOf("https://") == -1 && data.indexOf(":") == -1) {
                    options.push(data.replace("/wiki/", ""));
                }
            });
            const randomElement = options[Math.floor(Math.random() * options.length)];
            //console.log(randomElement)
            var article = btoa(randomElement);
            LoadCustom(article);
        });
    }

    /**
     * Copies the game slug.
     */
    function copySlug() {
        navigator.clipboard.writeText(btoa(ans.join(" ")));
        $(".tooltiptext").show();
        setTimeout(function() {$(".tooltiptext").hide('fast')}, 1000);
    }

    /**
     * Make genGame and LoadCustomPopup available on the window.
     */
    window.genGame = function genGame() {
        generateGame();
    }
    window.copySlug = function() {
        copySlug();
    }
    window.LoadCustomPopup = function LoadCustomPopup() {
        var game = prompt('Enter a game code. Leave it blank for a random Redactle-approved article, or enter a base64 article slug for a specific article.');
        if (game == null) {
            return;
        }
        if (!game) {
            game = smallList[Math.floor(Math.random() * smallList.length)];
        }
        LoadCustom(game);
    }

    // Add the Custom and Random game buttons and then add the redactle numbers
    document.querySelector('ul.navbar-nav').innerHTML += '<li class="nav-item"><a class="nav-link mx-2" href="javascript:LoadCustomPopup()">Custom</a></li>';
    document.querySelector('ul.navbar-nav').innerHTML += '<li class="nav-item"><a class="nav-link mx-2" href="javascript:genGame()">Random Game</a></li>';
    document.querySelector('ul.navbar-nav').innerHTML += '<li class="nav-item"><a class="nav-link mx-2" href="javascript:copySlug()">Share</a><span class="tooltiptext" style="display: none;">Game code copied!</span></li>';
    $('#inGrp').append('<div class="mx-4" style="font-size: 1.25rem;" id="guessCount"></div>');
    waitForPageCompletion();
})();
