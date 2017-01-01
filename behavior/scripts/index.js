'use strict'
const Audiosearch = require('audiosearch-client-node')
const audiosearch = new Audiosearch(process.env.AUDIOSEARCH_APP_ID, process.env.AUDIOSEARCH_SECRET)

function searchShows(query, callback){
  audiosearch.searchShows(query)
    .then(shows => {
      console.log(shows)
      if (callback) {
        callback(shows)
      }
    })
    .catch(ex => {
      console.log(endpoint, ex)
      if (callback) {
        callback()
      }
    })
}

function searchSimilarShows(show, callback){
  audiosearch.getRelated(show.id)
    .then(shows => {
      console.log(shows)
      if (callback) {
        callback(shows)
      }
    })
    .catch(ex => {
      console.log(endpoint, ex)
      if (callback) {
        callback()
      }
    })
}


exports.handle = (client) => {
  // Create steps
  const sayHello = client.createStep({
    satisfied() {
      return Boolean(client.getConversationState().helloSent)
    },

    prompt() {
      client.addResponse('welcome')

      client.updateConversationState({
        helloSent: true
      })

      client.done()
    }
  })

  const untrained = client.createStep({
    satisfied() {
      return false
    },

    prompt() {
      client.addResponse('apology/untrained')
      client.done()
    }
  })

  const findShow = client.createStep({
    extractInfo() {
      let podcastTitle = firstOfEntityRole(client.getMessagePart(), 'podcast_title')

      if (podcastTitle) {
        client.updateConversationState({
          requestedPodcastTitle: podcastTitle,
        })
      }
    },

    satisfied() {
      return Boolean(client.getConversationState().show)
    },

    prompt(done) {
      searchShows(client.getConversationState().requestedPodcastTitle, shows => {
        client.updateConversationState({
          show: shows[0],
        })
        done()
      })
    }
  })

  const recommendSimilar = client.createStep({
    satisfied() {
      return Boolean(client.getConversationState().recommendedShows)
    },

    prompt(done) {
      searchSimilarShows(client.getConversationState().show, shows => {
        client.addResponse('3_podcasts', {
          'podcast_title#1': shows[0],
          'podcast_title#2': shows[1],
          'podcast_title#3': shows[2],
        })

        client.done()
      })
    }
  })

  client.runFlow({
    classifications: {
      // map inbound message classifications to names of streams
      'user_ask_recommendation/similar_podcast': 'recommendSimilar'
    },
    autoResponses: {
      // configure responses to be automatically sent as predicted by the machine learning model
    },
    streams: {
      main: 'hello',
      hello: [sayHello],
      recommendSimilar: [findShow, recommendSimilar],
    },
  })
}
