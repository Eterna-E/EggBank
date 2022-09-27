function show_hide() {
    var savemoney = document.getElementById("container2");
    var takemoney = document.getElementById("container3");
    var copyright = document.getElementById("copyright");
  
    if (savemoney.style.display === "none") {
        savemoney.style.display = "block";  //lonin出現
        document.getElementById("username").value="";
        document.getElementById("password").value="";
        takemoney.style.display = "none";  //takemoney消失
        copyright.style.margin = "200px 0px 0px 0px";
    } else {
        savemoney.style.display = "none";   //savemoney消失
        takemoney.style.display = "block"; //takemoney出現
        takemoney.style.visibility="visible";
        copyright.style.margin = "200px 0px 0px 0px";
     
        document.getElementById("fullname").value="";
        document.getElementById("username2").value="";
        document.getElementById("password2").value="";
        document.getElementById("comfirm_password").value="";
    }
}