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
    return temp.user.id;
}

async function get_real_name(user_id){
    let email = await get_email(user_id);
    let real_name = "";
    if(email !== null){
        real_name = await get_real_name_using_email(email);
    }
    return real_name;
}

async function get_reviewers(project_id, mr_iid){
    let reviewer_list = [];
    let link = `https://gitlab.com/api/v4/projects/${project_id}/merge_requests/${mr_iid}`;
    console.log(link);
            
    //text = "New Merge Request";
    console.log("API Call started");
    let response = await callback_func(link);
    console.log("\n\n MERGE REQUEST:\n");
    console.log("Data Received");
    console.log(response);

    let reviewers = response.reviewers;
    for(let i=0; i<reviewers.length; i++){
        //let temp = await callback_func_with_auth(`https://gitlab.com/api/v4/users/${reviewers[i].id}`, process.env.GITLAB_USERS_TOKEN);
        //let temp2 = await callback_func_with_auth(`https://slack.com/api/users.lookupByEmail?email=${temp.public_email}`, process.env.SLACK_TOKEN);
        let name = await get_real_name(reviewers[i].id);
        reviewer_list.push(name);
    }

    return reviewer_list;

}

async function get_assignees_using_mr_request(project_id, mr_iid){
    let assignee_list = [];
    let link = `https://gitlab.com/api/v4/projects/${project_id}/merge_requests/${mr_iid}`;
    console.log(link);
            
    //text = "New Merge Request";
    console.log("API Call started");
    let response = await callback_func(link);
    console.log("\n\n MERGE REQUEST:\n");
    console.log("Data Received");
    console.log(response);

    let assignees = response.assignees;
    for(let i=0; i<assignees.length; i++){
        //let temp = await callback_func_with_auth(`https://gitlab.com/api/v4/users/${reviewers[i].id}`, process.env.GITLAB_USERS_TOKEN);
        //let temp2 = await callback_func_with_auth(`https://slack.com/api/users.lookupByEmail?email=${temp.public_email}`, process.env.SLACK_TOKEN);
        let name = await get_real_name(assignees[i].id);
        assignee_list.push(name);
    }

    return assignee_list;  
}

async function get_assignees(assignees){
    let assignee_list = [];
    for(let i=0; i<assignees.length; i++){
        //console.log(assignees[i])
        let name = await get_real_name_using_email(assignees[i].email);
        assignee_list.push(name);
    }
    return assignee_list;
}

async function all_mrs_msg(proj_id){
    let mr_list = await callback_func(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests`);
    let text = `LIST OF ALL PENDING MERGE REQUESTS:`;
    let count = 0;
    for(let i=0; i<mr_list.length; i++){
        let mr = mr_list[i];
        let mr_id = mr.iid;
        if(mr.state == "opened"){
            count++;
            text += `\n\n\t ${count}. LINK: ${mr.web_url} \n REVIEWERS:`;
            let reviewer_list = await get_reviewers(proj_id, mr_id);
            for(let j=0; j<reviewer_list.length; j++){
                text += ` <@${reviewer_list[j]}>`;
            }
            text += `\n ASSIGNEES: `;
            let assignee_list = await get_assignees_using_mr_request(proj_id, mr_id);
            for(let j=0; j<assignee_list.length; j++){
                text += ` <@${assignee_list[j]}>`;
            }
        }
    }
    return text;
}

async function all_discussions_msg(proj_id){
    let mr_list = await callback_func(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests`);
    let text = `LIST OF ALL PENDING COMMENTS:`;
    let count = 0;
    for(let i=0; i<mr_list.length; i++){
        let mr = mr_list[i];
        let mr_id = mr.iid;
        if(mr.state == "opened"){
            let comments_in_mr = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests/${mr_id}/discussions`, process.env.GITLAB_USERS_TOKEN);
            for(let j=0; j<mr_list.length; j++){
                let comment = comments_in_mr[j].notes[0];
                if(comment.resolvable && !comment.resolved){
                    count++;
                    text += `\n\n ${count}. ${comment.body}\n MR LINK: ${mr.web_url}`;
                    text += `\nASSIGNEES: `;
                    let assignee_list = await get_assignees_using_mr_request(proj_id, mr_id);
                    for(let k=0; k<assignee_list.length; k++){
                        text += `<@${assignee_list[k]}>`;
                    }
                }
            }
        }
    }
    return text;
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


            //let link = `https://gitlab.com/api/v4/projects/${id}/merge_requests/${merge_request_id}`;
            //console.log(link);
            
            //text = "New Merge Request";
            //console.log("API Call started");
            //let response = await callback_func(link);
            //console.log("\n\n MERGE REQUEST:\n");
            //console.log("Data Received");
            //console.log(response);
            
            let reviewer_list = await get_reviewers(id, merge_request_id);

            let merger_email_id = trig.user.email;
            let assignees = trig.assignees;
            //let reviewers = response.reviewers;
            let proj_link = trig.project.http_url;
            let mr_link = trig.object_attributes.url;
            let action = trig.object_attributes.action;
            
            let assignee_list = await get_assignees(assignees);
            //let reviewer_list = [];
            
            //console.log('MERGER ID');
            //console.log(merger_id);
            //console.log('ASSIGNEES');
            //console.log(assignees);
            //console.log('REVIEWERS');
            //console.log(reviewers);
            
            console.log('ASSIGNEES');
            /*for(let i=0; i<assignees.length; i++){
                //console.log(assignees[i])
                let name = await get_real_name_using_email(assignees[i].email);
                assignee_list.push(name);
            }*/

            console.log("\n\nTHIS IS THE LIST OF DISPLAY NAMES OF ASSIGNEES");
            console.log(assignee_list);
            
            /*for(let i=0; i<reviewers.length; i++){
                //let temp = await callback_func_with_auth(`https://gitlab.com/api/v4/users/${reviewers[i].id}`, process.env.GITLAB_USERS_TOKEN);
                //let temp2 = await callback_func_with_auth(`https://slack.com/api/users.lookupByEmail?email=${temp.public_email}`, process.env.SLACK_TOKEN);
                let name = await get_real_name(reviewers[i].id);
                reviewer_list.push(name);
            }*/

            let merger_name = await get_real_name_using_email(merger_email_id);

            console.log("\n\nTHIS IS THE LIST OF REVIEWERS");
            console.log(reviewer_list);

            if(action == 'open'){

                text = `MERGE REQUEST OPENED`;
                text += `\n\n STARTED BY: <@${merger_name}>`;
                text += `\n\n LINK TO REPOSITORY: ${proj_link}`;
                text += `\n\n MERGE REQUEST LINK: ${mr_link}`;
                text += `\n\n${trig.object_attributes.title}\n${trig.object_attributes.description}`;

                text += `\n\nLIST OF ASSIGNEES FOR MERGE REQUEST ARE:`;
                for(let i=0; i<assignee_list.length; i++){
                    text = `${text} <@${assignee_list[i]}>`;
                }
                text += "\n\n LIST OF REVIEWERS FOR MERGE REQUEST ARE:";
                for(let i=0; i<reviewer_list.length; i++){
                    text += ` <@${reviewer_list[i]}>`;
                }
            }
            else if(action == 'update'){

                text = `MERGE REQUEST UPDATED`;
                text += `\n\n STARTED BY: <@${merger_name}>`;
                text += `\n\n LINK TO REPOSITORY: ${proj_link}`;
                text += `\n\n MERGE REQUEST LINK: ${mr_link}`;
                text += `\n${trig.object_attributes.description}`;

                text += `\n\nLIST OF ASSIGNEES FOR MERGE REQUEST ARE:`;
                for(let i=0; i<assignee_list.length; i++){
                    text = `${text} <@${assignee_list[i]}>`;
                }
                text += "\n\n LIST OF REVIEWERS FOR MERGE REQUEST ARE:";
                for(let i=0; i<reviewer_list.length; i++){
                    text += ` <@${reviewer_list[i]}>`;
                }                
            }

            /*console.log("\n\nMERGE REQUEST COMMENTS\n");
            let link = `https://gitlab.com/api/v4/projects/${id}/merge_requests/${merge_request_id}/notes`;
            let response = await callback_func(link);
            console.log(response);*/
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
            if(trig.assignees !== undefined){
                text += `\n ASSIGNEES: `
                for(let i=0; i<issue_list.length; i++){
                    text += `<@${issue_list[i]}> `;
                }
            }
            text += `\n\n\n\t${issue_title}`;
            text += `\n${issue_desc}`;
            break;
        
        case "note":
            name = await get_real_name_using_email(trig.user.email);
            console.log("COMMENT");
            console.log(trig);
            if(trig.object_attributes.noteable_type === "MergeRequest"){
                text = `New comment added to Merge Request: ${trig.object_attributes.url}`;
                text += `\nMerge Request Link: ${trig.merge_request.url}`;
                text += `\n\nAssignees: `;
                for(let i=0; i<trig.merge_request.assignee_ids.length; i++){
                    let temp = await get_real_name(trig.merge_request.assignee_ids[i]);
                    text += ` <@${temp}>`;
                }
                console.log("\n\nMERGE REQUEST COMMENTS\n");
                let id = trig.project_id;
                let merge_request_id = trig.merge_request.iid;
                let link = `https://gitlab.com/api/v4/projects/${id}/merge_requests/${merge_request_id}/notes`;
                let response = await callback_func_with_auth(link, process.env.GITLAB_USERS_TOKEN);
                console.log(response);
            }
            else{
                text = `New Comment made by <@${name}>, for a ${trig.object_attributes.noteable_type}`;
                text += `\n\nLink for Comment: ${trig.object_attributes.url}`;
            }
            break;
        
        case "pipeline":
            if(trig.object_attributes.status !== "success"){
                console.log("\n\nPIPELINE FAILURE RESPONSE");
                console.log(trig);
                text = `PIPELINE FAILED FOR COMMIT: ${trig.commit.url}`;
                if(trig.merge_request != null){
                    text += `\nMerge Request Link: ${trig.merge_request.url}`;
                    text += `\n\nAssignees: `;
                    for(let i=0; i<trig.merge_request.assignee_ids.length; i++){
                        let temp = await get_real_name(trig.merge_request.assignee_ids[i]);
                        text += ` <@${temp}>`;
                    }
                }
            }
            else{
                let id = trig.project.id;
                let mrid = trig.merge_request.iid;
                let link = `https://gitlab.com/api/v4/projects/${id}/merge_requests/${mrid}`;
                let response = await callback_func(link);

                console.log("\n\nRESPONSE FOR MERGE REQUEST DETAILS");
                console.log(response);

                if(trig.object_attributes.action === "approved"){
                    text = `MERGE REQUEST APPROVED: ${trig.object_attributes.url}`;
                    text += `\n<!here>`;      
                }
            }
            break;
        default:
            name = await get_real_name_using_email(trig.user.email);
            text = `New Notification for <@${name}>: ${trig.object_kind} Obtained`;
            text += `LINK: ${trig.object_attributes.url}`;
    }

    //let id = trig.project.id;
    //text += await all_mrs_msg(id);
    //text += await all_discussions_msg(id);
    return text;
}


module.exports = {slack_msg, all_discussions_msg, all_mrs_msg};