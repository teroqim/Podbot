'use strict'
const Audiosearch = require('./lib/audiosearch')

exports.handle = (client) => {
  const envVars = client.getEnvironment()
  const auAppId = process.env.AUDIOSEARCH_APP_ID || envVars.AUDIOSEARCH_APP_ID
  const auSecret = process.env.AUDIOSEARCH_SECRET || envVars.AUDIOSEARCH_SECRET
  const audiosearch = new Audiosearch(auAppId, auSecret)

  function searchShows(query, callback){
    audiosearch.searchShows(query)
      .then(response => {
        // console.log('search: '+response)
        if (callback) {
          callback(response.results)
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
      .then(response => {
        // console.log(response)
        if (callback) {
          callback(response)
        }
      })
      .catch(ex => {
        console.log(endpoint, ex)
        if (callback) {
          callback()
        }
      })
  }

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

  const findShow = client.createStep({
    extractInfo() {
      let podcastTitle = client.getFirstEntityWithRole(client.getMessagePart(), 'podcast_title')
      console.log('found title in extract:', podcastTitle)
      if (podcastTitle) {
        client.updateConversationState({
          requestedPodcastTitle: podcastTitle,
        })
      }
    },

    satisfied() {
      console.log('findshow satisfied:', Boolean(client.getConversationState().show))
      return Boolean(client.getConversationState().show)
    },

    prompt(done) {
      console.log('findShow prompt')
      searchShows(client.getConversationState().requestedPodcastTitle.value, shows => {
        console.log('findShow callback:', shows[0].title)
        client.updateConversationState({
          show: shows[0],
        })
        client.done()
        done()
      })
    }
  })

  const recommendSimilar = client.createStep({
    satisfied() {
      return false
    },

    prompt(done) {
      console.log('recommendSimilar prompt')
      searchSimilarShows(client.getConversationState().show, shows => {
        console.log('recommendSimilar callback')
        client.addResponse('bot_recommend/3_podcasts', {
          'podcast_title#1': shows[0].title,
          'podcast_title#2': shows[1].title,
          'podcast_title#3': shows[2].title,
        })

        client.done()
        done()
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
