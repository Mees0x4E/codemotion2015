var frequency = 220;
var amplitude = 0;

var fakeCircleWidget = {
    // the original (https://github.com/citronneur/onlinetuner.co) was modified to make this work
    show : function(f, ampl) {
        frequency = parseFloat(f);
        amplitude = Math.max(0, parseFloat(ampl));
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
    new OnlineTuner.Analyser(tuners, 1<<12, 500).install(function() {
        console.log("Succesfully initialized");
        
    }, function(errorMessage) {
        console.error("Oops, this shouldn't happen", errorMessage);
    });
}