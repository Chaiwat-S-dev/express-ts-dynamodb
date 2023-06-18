$(document).ready(function() {
    $(".nav-item").click(function() {
        console.log("nav-item-click")
    })
})

$(document).ready(function() {
    var searchVal = ""
    $(".input_search").keydown(function() {
        searchVal += $(this).attr("value")
        console.log(searchVal)
    })
    $(".button_search").click(function() {
        alert(searchVal)
    })
})