$(document).ready(() => {
    // Initialization
    let languageUser = localStorage.getItem('lang') || 'en-US'; // Default to 'en-US' if not set
    const resultDiv = $('#result');
    const stopTTSButton = $('#stop-tts');
    const textInputButton = $('#text-input-btn');
    const silentModeToggle = $('#silent-mode-toggle');
    const textInputField = $('#text-input');
    const settingsSaveFeedback = $('<div id="settingsFeedback" style="color: lightgreen; margin-top: 10px; display: none;">Settings saved!</div>');
    let silentMode = JSON.parse(localStorage.getItem('silentMode')) || false;
    let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];

    // Append feedback message element to settings area
    $('#settingsArea').append(settingsSaveFeedback);

    // Initial state of settings area
    $('#settingsArea').hide();

    // Toggle settings area visibility
    $('#settingsBtn').click(() => {
        $('#settingsArea').toggle();
    });

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    const updateUIBasedOnLanguage = () => {
        if (languageUser === 'he-IL') {
            $('#settingsBtn').text('הגדרות');
            $('#text-input').attr('placeholder', 'הקלד את השאלה שלך כאן');
            $('#save').text('שמור הגדרות');
            $('#silent-mode-toggle').text(silentMode ? 'מצב שקט: פועל' : 'מצב שקט: כבוי');
            $('#toggle-recognition').text('התחל לדבר');
            $('#text-input-btn').text('שלח שאלה');
            $('#stop-tts').text('עצור דיבור');
            $('#deleteConversation').text('מחק שיחה');
            $('#resetSession').text('התחל שיחה חדשה');
        } else {
            $('#settingsBtn').text('Settings');
            $('#text-input').attr('placeholder', 'Type your prompt here');
            $('#save').text('Save Settings');
            $('#silent-mode-toggle').text(silentMode ? 'Silent Mode: ON' : 'Silent Mode: OFF');
            $('#toggle-recognition').text('Start Talking');
            $('#text-input-btn').text('Send Prompt');
            $('#stop-tts').text('Stop TTS');
            $('#deleteConversation').text('Delete Chat');
            $('#resetSession').text('Start New Chat');
        }
    };

    recognition.lang = languageUser;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        processPrompt(speechResult);
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition error:", event.error);
    };

    $('#toggle-recognition').click(() => {
        recognition.lang = languageUser; // Set the language according to currently selected language
        recognition.start();
    });

    // Load saved settings
    const savedToken = JSON.parse(localStorage.getItem('apiToken')) || '';
    $('#apiToken').val(savedToken);
    
    const savedMaxTokens = localStorage.getItem('maxTokens') || '150';
    const savedTemperature = localStorage.getItem('temperature') || '0.5';

    $('#maxTokens').val(savedMaxTokens);
    $('#temperature').val(savedTemperature);

    // Save settings
    $('#save').click(() => {
        const newToken = $('#apiToken').val();
        const maxTokens = $('#maxTokens').val();
        const temperature = $('#temperature').val();
        const lang = $('#lang').val();

        languageUser = lang; // Update language based on user selection
        recognition.lang = languageUser;
        localStorage.setItem('apiToken', JSON.stringify(newToken));
        localStorage.setItem('maxTokens', maxTokens);
        localStorage.setItem('temperature', temperature);
        localStorage.setItem('lang', lang);

        updateSilentModeButtonText();
        updateUIBasedOnLanguage();

        // Show feedback message and hide settings after fade out
        settingsSaveFeedback.fadeIn().delay(5000).fadeOut(() => {
            $('#settingsArea').hide();
        });
    });

    $('#silent-mode-toggle').click(() => {
        silentMode = !silentMode;
        localStorage.setItem('silentMode', silentMode);
        updateSilentModeButtonText();
    });

    const updateSilentModeButtonText = () => {
        $('#silent-mode-toggle').text(silentMode ? (languageUser === 'he-IL' ? 'מצב שקט: פועל' : 'Silent Mode: ON') : (languageUser === 'he-IL' ? 'מצב שקט: כבוי' : 'Silent Mode: OFF'));
    };

    // Initialize button text based on selected language
    updateUIBasedOnLanguage();

    $('#deleteConversation').click(() => {
        conversationHistory = [];
        localStorage.removeItem('conversationHistory');
        resultDiv.empty();
    });

    $('#resetSession').click(() => {
        conversationHistory = [];
        localStorage.removeItem('conversationHistory');
        resultDiv.empty();
    });

    function speakText(text) {
        if ('speechSynthesis' in window && !silentMode) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languageUser;
            utterance.onend = () => stopTTSButton.prop('disabled', true);
            window.speechSynthesis.speak(utterance);
            stopTTSButton.prop('disabled', false);
        }
    }

    textInputButton.click(() => {
        const textPrompt = textInputField.val();
        if (textPrompt) {
            processPrompt(textPrompt);
            textInputField.val('');
        }
    });

    async function processPrompt(userInput) {
        resultDiv.append(`<div class='user-text'>${languageUser === 'he-IL' ? 'משתמש' : 'User'}: ${userInput}</div>`);
        conversationHistory.push({ role: 'user', content: userInput });

        const requestBody = {
            model: "gpt-3.5-turbo",
            messages: conversationHistory,
            max_tokens: parseInt($('#maxTokens').val()),
            temperature: parseFloat($('#temperature').val())
        };

        try {
            const response = await $.ajax({
                url: 'https://api.openai.com/v1/chat/completions',
                type: 'POST',
                headers: { 
                    "Authorization": `Bearer ${JSON.parse(localStorage.getItem('apiToken'))}`,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(requestBody)
            });

            const generatedContent = response.choices[0].message.content.trim();
            resultDiv.append(`<div class='ai-response'>${languageUser === 'he-IL' ? 'AI' : 'AI'}: ${generatedContent}</div>`);
            conversationHistory.push({ role: 'assistant', content: generatedContent });
            localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
            
            // Speak the AI response
            speakText(generatedContent);
        } catch (error) {
            console.error("Error communicating with the API:", error);
            resultDiv.append("<div class='error-text'>An error occurred while fetching the response.</div>");
        }
    }

    if (conversationHistory.length > 0) {
        conversationHistory.forEach(message => {
            const roleClass = message.role === 'user' ? 'user-text' : 'ai-response';
            resultDiv.append(`<div class='${roleClass}'>${message.role.charAt(0).toUpperCase() + message.role.slice(1)}: ${message.content}</div>`);
        });
    }

    stopTTSButton.on('click', () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            stopTTSButton.prop('disabled', true);
        }
    });

    $('#lang').change(() => {
        const selectedLang = $('#lang').val();
        languageUser = selectedLang === 'he-IL' ? 'he-IL' : 'en-US';
        recognition.lang = languageUser;
        localStorage.setItem('lang', selectedLang);
        updateUIBasedOnLanguage();
    });
});