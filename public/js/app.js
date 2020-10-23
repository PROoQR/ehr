$(document).ready(function () {
  $("#gen").click(function() {
    var arr = $('form#sfm').serializeArray();
    var data = {};
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i];
      if (data.hasOwnProperty(d.name)) {
        data[d.name] = data[d.name] + ',' + d.value;
      } else {
        data[d.name] = d.value;
      }
    }
    var qrc = data.survey+':'+data.ver
    for (var key in data) {
      if (data.hasOwnProperty(key) && key != 'survey' && key != 'ver' ) {
        qrc += '/'+key+':'+data[key];
      }
    }
    QRCode.toCanvas(document.getElementById('can'), qrc, function (error) {
      $('#box').modal();
    })    
  });

  $('#accept').click(function(e) {
    e.preventDefault();
    Swal.fire({
      title: 'Are your sure to accept?',
      text: "Please double-check the follow-up tag.",
      type: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.value) {
        $("#acceptFrm").submit();
      }
    });
  });
});
