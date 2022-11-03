var frequency = 220;

var fakeCircleWidget = {
    // the original (https://github.com/citronneur/onlinetuner.co) was modified to make this work
    show : function(f) {
        frequency = parseFloat(f);
        // console.debug(frequency);
}
};

function initializeTuner() {
   
    // Create a single or multiple instance of tuners at time
    var tuners = [
        new OnlineTuner.Controller.GuitareTuner(
            fakeCircleWidget
            /*(new OnlineTuner.Widget.CircleWidget(
                Settings.container, 
                Settings.backgroundColor, 
                Settings.notOkayColor, 
                Settings.okayColor, 
                Settings.fontColor
            )*/
        )
    ];
    
    // Initialize the tuner with the callbacks
    new OnlineTuner.Analyser(tuners).install(function() {
        console.log("Succesfully initialized");
        
    }, function(errorMessage) {
        console.error("Oops, this shouldn't happen", errorMessage);
    });
}