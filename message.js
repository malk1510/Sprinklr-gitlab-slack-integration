const { default: axios } = require("axios");

async function callback_func(link){
    const response = await axios.get(link);
    console.log("API Call Occured");
    return response.data;
}

async function callback_func_with_auth(link, token){
    console.log('LINK')
    console.log(link);
    //console.log(`AUTHORIZATION CODE`);
    //console.log(`Bearer ${token}`);
    const response = await axios.get(link, {
        headers: {
            authorization: `Bearer ${token}`
        }
    });
    console.log(response.data);
    return response.data;
}

async function get_email(user_id){
    let temp = await callback_func_with_auth(`https://gitlab.com/api/v4/users/${user_id}`, process.env.GITLAB_USERS_TOKEN);
    return temp.public_email;
}

async function get_real_name_using_email(email){
    let temp = await callback_func_with_auth(`https://slack.com/api/users.lookupByEmail?email=${email}`, process.env.SLACK_TOKEN);
    return temp.user.profile.real_name;
}

async function get_real_name(user_id){
    let email = await get_email(user_id);
    let real_name = await get_real_name_using_email(email);
    return real_name;
}

async function slack_msg(trig){
    console.log(trig);
    let text = "";
    let name = "";
    switch(trig.object_kind){
        case "merge_request":
            let id = trig.project.id;
            let merge_request_id = trig.object_attributes.iid;
            //console.log(`THE ID IS ${id}`);
            //console.log(`THE OTHER ID IS ${merge_request_id}`);

            let link = `https://gitlab.com/api/v4/projects/${id}/merge_requests/${merge_request_id}`;
            console.log(link);
            
            text = "New Merge Request";
            console.log("API Call started");
            let response = await callback_func(link);
            console.log("\n\n MERGE REQUEST:\n");
            console.log("Data Received");
            console.log(response);
            
            let merger_email_id = trig.user.email;
            let assignees = trig.assignees;
            let reviewers = response.reviewers;
            let proj_link = trig.project.http_url;
            let mr_link = trig.object_attributes.url;
            let action = trig.object_attributes.action;
            
            let assignee_list = [];
            let reviewer_list = [];
            
            //console.log('MERGER ID');
            //console.log(merger_id);
            //console.log('ASSIGNEES');
            //console.log(assignees);
            //console.log('REVIEWERS');
            //console.log(reviewers);
            
            console.log('ASSIGNEES');
            for(let i=0; i<assignees.length; i++){
                //console.log(assignees[i])
                let name = await get_real_name_using_email(assignees[i].email);
                assignee_list.push(name);
            }

            console.log("\n\nTHIS IS THE LIST OF DISPLAY NAMES OF ASSIGNEES");
            console.log(assignee_list);
            
            for(let i=0; i<reviewers.length; i++){
                //let temp = await callback_func_with_auth(`https://gitlab.com/api/v4/users/${reviewers[i].id}`, process.env.GITLAB_USERS_TOKEN);
                //let temp2 = await callback_func_with_auth(`https://slack.com/api/users.lookupByEmail?email=${temp.public_email}`, process.env.SLACK_TOKEN);
                let name = await get_real_name(reviewers[i].id);
                reviewer_list.push(name);
            }

            let merger_name = await get_real_name_using_email(merger_email_id);

            console.log("\n\nTHIS IS THE LIST OF REVIEWERS");
            console.log(reviewer_list);

            text = `MERGE REQUEST ${action}`;
            text += `\n\n STARTED BY: <@${merger_name}>`;
            text += `\n\n LINK TO REPOSITORY: ${proj_link}`;
            text += `\n\n MERGE REQUEST LINK: ${mr_link}`;

            text += `\n\nLIST OF ASSIGNEES FOR MERGE REQUEST ARE:`;
            for(let i=0; i<assignee_list.length; i++){
                text = `${text} <@${assignee_list[i]}>`;
            }
            text += "\n\n LIST OF REVIEWERS FOR MERGE REQUEST ARE:";
            for(let i=0; i<reviewer_list.length; i++){
                text += ` <@${reviewer_list[i]}>`;
            }
            break;
        
        case "issue":
            name = await get_real_name_using_email(trig.user.email);
            let issue_title = trig.object_attributes.title;
            let issue_desc = trig.object_attributes.description;
            let issue_action = trig.object_attributes.action;
            let issue_list = [];

            for(let i=0; i<trig.assignees.length; i++){
                let ass_name = await get_real_name_using_email(trig.assignees[i].email);
                issue_list.push(name);
            }
            text = `ISSUE ${issue_action}`;
            text += `\n\n AUTHOR: <@${name}>`;
            if(trig.assignees){
                text += `\n ASSIGNEES: `
                for(let i=0; i<issue_list.length; i++){
                    text += `<@${issue_list[i]}> `;
                }
            }
            text += `\n\n\n\t${issue_title}`;
            text += `\n${issue_desc}`;
            break;

        default:
            name = await get_real_name_using_email(trig.user.email);
            text = `New Notification for <@${name}>: ${trig.object_kind} Obtained`;
    }
    return text;
}


module.exports = {slack_msg};