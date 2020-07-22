$(document).ready(function() {
		$.ajax({
			type: "GET",
			url: "navbar.html",
			success: function(data) {
				$('#navbar').html(data)
				activTab=$('#navbar').attr('activeTab')
				$("#"+activTab).parent().find('li').removeClass("active");
    			$("#"+activTab).addClass("active");
			}
		});
})