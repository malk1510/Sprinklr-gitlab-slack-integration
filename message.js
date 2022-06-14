const { default: axios } = require("axios");

let iid_list = [];
let wip_list = [];

async function jira_api_call(link){
    const response = await axios.get(link, {
        headers:{
            'Content-Type':'application/json'
        },
        auth:{
            username: process.env.JIRA_EMAIL_ID,
            password: process.env.JIRA_PASSWORD
        }
    });
    return response.data;
}

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

async function get_summary(project_id){
    let open_date = new Date(new Date().getTime() - 24*60*60*1000);
    let temp = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${project_id}/merge_requests?state=opened`, process.env.GITLAB_USERS_TOKEN);
    let temp2 = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${project_id}/merge_requests?created_after=${open_date.toISOString()}`, process.env.GITLAB_USERS_TOKEN);
    let text = `SUMMARY:\n PENDING MERGE REQUESTS: ${temp.length}\n MERDGE REQUESTS OPENED TODAY: ${temp2.length}`;
    return text;
}

async function get_reviewers(project_id, mr_iid){
    let reviewer_list = [];
    let link = `https://gitlab.com/api/v4/projects/${project_id}/merge_requests/${mr_iid}`;
    console.log(link);
            
    //text = "New Merge Request";
    console.log("API Call started");
    let response = await callback_func_with_auth(link, process.env.GITLAB_USERS_TOKEN);
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
    let response = await callback_func_with_auth(link, process.env.GITLAB_USERS_TOKEN);
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

async function all_mrs_msg(proj_id, time){
    let prev_date = (new Date(new Date().getTime() - time)).toISOString();
    let mr_list = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests?updated_before=${prev_date}`, process.env.GITLAB_USERS_TOKEN);
    let text = `LIST OF ALL PENDING MERGE REQUESTS:`;
    let count = 0;
    for(let i=0; i<mr_list.length; i++){
        let mr = mr_list[i];
        let mr_id = mr.iid;
        if(!iid_list.includes(mr_id)){
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
            console.log(text);
        }
    }}
    return text;
}

async function all_discussions_msg(proj_id, time){
    let prev_date = (new Date(new Date().getTime() - time)).toISOString();
    let mr_list = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests?updated_before=${prev_date}`, process.env.GITLAB_USERS_TOKEN);
    let text = `LIST OF ALL PENDING COMMENTS:`;
    let count = 0;
    for(let i=0; i<mr_list.length; i++){
        let mr = mr_list[i];
        let mr_id = mr.iid;
        let page = 1;
        if(!iid_list.includes(mr_id)){
        if(mr.state == "opened"){
            while(true){
            let comments_in_mr = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests/${mr_id}/discussions?page=${page}`, process.env.GITLAB_USERS_TOKEN);
            page++;
            if(comments_in_mr.length == 0)
                break;
            for(let j=0; j<comments_in_mr.length; j++){
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
    }}
    }
    return text;
}

async function notify_mr(proj_id, thresh_time){
    let prev_date = (new Date(new Date().getTime() - thresh_time - 2000)).toISOString();
    let next_date =  (new Date(new Date().getTime() - thresh_time + 60000)).toISOString();
    console.log(`\nPREVIOUS DATE: ${prev_date}`);
    console.log(`\nNEXT DATE: ${next_date}`);
    let mr_list = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests?created_before=${next_date}&created_after=${prev_date}&state=opened`, process.env.GITLAB_USERS_TOKEN);
    let text = `REMINDER!! PENDING MERGE REQUESTS:`;
    let count = 0;
    if(mr_list.length == 0)
        return '';
    for(let i=0; i<mr_list.length; i++){
        let mr = mr_list[i];
        let mr_id = mr.iid;
        if(!iid_list.includes(mr_id)){
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
        }}
    }
    return text;
}

async function notify_comment(proj_id, thresh_time){
    let prev_date = (new Date(new Date().getTime() - thresh_time - 500)).toISOString();
    let next_date =  (new Date(new Date().getTime() - thresh_time + 60000)).toISOString();
    let mr_list = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests?updated_before=${next_date}&updated_after=${prev_date}&state=opened`, process.env.GITLAB_USERS_TOKEN);
    let text = `REMINDER!! PENDING UNRESOLVED DISCUSSIONS:`;
    let count = 0;
    if(mr_list.length == 0)
        return '';
    for(let i=0; i<mr_list.length; i++){
        let mr = mr_list[i];
        let mr_id = mr.iid;
        if(!iid_list.includes(mr_id)){
        let page = 1;
        while(true){
            let comments_in_mr = await callback_func_with_auth(`https://gitlab.com/api/v4/projects/${proj_id}/merge_requests/${mr_id}/discussions?page=${page}`, process.env.GITLAB_USERS_TOKEN);
            page++;
            if(comments_in_mr.length == 0)
                break;
            for(let j=0; j<comments_in_mr.length; j++){
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
    }}
    return text;
}

async function get_wip_mrs(proj_id, mrs_list){
    if(mrs_list.length == 0)
        return '';
    let text = `MRs IN PROGRESS: \n`;
    let count = 1;
    for(let i=0; i<mrs_list.length; i++){
        let mr = mr_list[i];
        let link = `https://gitlab.com/api/v4/projects/${proj_id}/merge_requests/${mr}`;
        let assignee_list = await get_assignees_using_mr_request(proj_id, mr);
        let reviewer_list = await get_reviewers(proj_id, mr);
        text += `\n\n ${count}. MR LINK: ${link}`;
        text += '\nASSIGNEES: \t';
        for(let j=0; j<assignee_list.length; j++){
            text += `<@${assignee_list[j]}> `;
        }
        text += `\nREVIEWERS: \t`;
        for(let j=0; j<reviewer_list.length; j++)
            text += `<@${reviewer_list[j]}> `;
    }
    return text;
}

async function slack_msg(trig){
    console.log(trig);
    let text = "";
    let name = "";

    if(trig.webhookEvent!==undefined && trig.webhookEvent.substring(0,4) == 'jira'){
        let id = trig.issue.id;
        let link = `https://sample-team.atlassian.net/rest/dev-status/latest/issue/detail?issueId=${id}&applicationType=GitLab&dataType=pullrequest`;
        let pr = await jira_api_call(link);
        console.log(pr);
        console.log(pr.detail);
        if(pr.detail !== undefined){
        let pr_list = pr.detail[0].pullRequests;
        console.log(trig.issue.fields.status.name);
        if(trig.issue.fields.status.name == 'To Do'){
            for(let i=0; i<pr_list.length; i++){
                console.log(pr_list[i]);
                let ch = parseInt(pr_list[i].url[pr_list[i].url.length-1]);
                let ind1 = iid_list.indexOf(ch);
                let ind2 = wip_list.indexOf(ch)
                if(ind1 >= 0)
                    iid_list.splice(ind1, 1);
                if(ind2 >= 0)
                    wip_list.splice(ind2, 1);
            }
        }
        else if(trig.issue.fields.status.name == 'In Progress'){
            for(let i=0; i<pr_list.length; i++){
                let ch = parseInt(pr_list[i].url[pr_list[i].url.length-1]);
                if(iid_list.indexOf(ch) == -1){
                    iid_list.push(ch);
                }
                if(wip_list.indexOf(ch) == -1){
                    wip_list.push(ch);
                }
            }
        }
        else{
            for(let i=0; i<pr_list.length; i++){
                console.log(pr_list[i]);
                let ch = parseInt(pr_list[i].url[pr_list[i].url.length-1]);
                let ind = wip_list.indexOf(ch);
                if(ind >= 0)
                    wip_list.splice(ind,1);
                if(iid_list.indexOf(ch) == -1)
                    iid_list.push(ch);
            }
        }}
        console.log(`\n\nTHE IID LIST IS: ${iid_list} \n\n`);
    }

    else{
    switch(trig.object_kind){
        case "merge_request":
            let id = trig.project.id;
            let merge_request_id = trig.object_attributes.iid;
            console.log(merge_request_id);
            console.log(iid_list.includes(merge_request_id));
            if(!iid_list.includes(merge_request_id)){
                console.log(`THE IID LIST IS: ${iid_list}`);
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
                if(trig.object_attributes.title.substring(0,5) !== 'Draft'){
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
                }}
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
            }

            else if(action == 'approved'){
                text = `MERGE REQUEST APPROVED: ${trig.object_attributes.url}`;
                text += `\n<!here>`;
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
                issue_list.push(ass_name);
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
                let merge_request_id = trig.merge_request.iid;
                if(!iid_list.includes(merge_request_id)){
                text = `New comment added to Merge Request: ${trig.object_attributes.url}`;
                text += `\nMerge Request Link: ${trig.merge_request.url}`;
                text += `\n\nAssignees: `;
                let assignee_list = await get_assignees_using_mr_request(trig.project.id, trig.merge_request.iid);
                for(let i=0; i<assignee_list.length; i++){
                    text += ` <@${assignee_list[i]}>`;
                }
                console.log("\n\nMERGE REQUEST COMMENTS\n");
                let id = trig.project_id;
                let link = `https://gitlab.com/api/v4/projects/${id}/merge_requests/${merge_request_id}/notes`;
                let response = await callback_func_with_auth(link, process.env.GITLAB_USERS_TOKEN);
                console.log(response);
            }}
            else{
                text = `New Comment made by <@${name}>, for a ${trig.object_attributes.noteable_type}`;
                text += `\n\nLink for Comment: ${trig.object_attributes.url}`;
            }
            break;
        
        case "pipeline":
            let mr_id = trig.merge_request.iid;
            if(!iid_list.includes(mr_id)){
            if(trig.object_attributes.status !== "success"){
                console.log("\n\nPIPELINE FAILURE RESPONSE");
                console.log(trig);
                text = `PIPELINE FAILED FOR COMMIT: ${trig.commit.url}`;
                if(trig.merge_request != null){
                    text += `\nMerge Request Link: ${trig.merge_request.url}`;
                    text += `\n\nAssignees: `;
                    let assignee_list = await get_assignees_using_mr_request(trig.project.id, trig.merge_request.iid);
                    for(let i=0; i<assignee_list.length; i++){
                        text += ` <@${assignee_list[i]}>`;
                    }
                }
            }
            else{
                let id = trig.project.id;
                let mrid = trig.merge_request.iid;
                let link = `https://gitlab.com/api/v4/projects/${id}/merge_requests/${mrid}`;
                let response = await callback_func_with_auth(link, process.env.GITLAB_USERS_TOKEN);

                console.log("\n\nRESPONSE FOR MERGE REQUEST DETAILS");
                console.log(response);

                if(response.object_attributes.status == "approved"){
                    text = `MERGE REQUEST APPROVED: ${trig.object_attributes.url}`;
                    text += `\n<!here>`;
                }
            }}
            break;
        default:
            text = '';
    }}

    //let id = trig.project.id;
    //text += await all_mrs_msg(id);
    //text += await all_discussions_msg(id);
    return text;
}


module.exports = {slack_msg, all_discussions_msg, all_mrs_msg, get_summary, notify_mr, notify_comment, get_wip_mrs, iid_list, wip_list};